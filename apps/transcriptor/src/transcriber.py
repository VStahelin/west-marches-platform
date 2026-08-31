import logging
import math
import os
import re
import shutil
from datetime import datetime

from src import config

logger = logging.getLogger(__name__)


class TranscriptionError(Exception):
    pass


def _report(progress_callback, message):
    logger.info(message)
    if progress_callback:
        progress_callback(message)


def import_source_file(selected_path):
    """Copy the selected audio file into the sources/audios folder and
    return the path of the copy that will actually be transcribed."""
    config.ensure_directories()

    filename = os.path.basename(selected_path)
    destination = os.path.join(config.SOURCES_DIR, filename)

    if os.path.abspath(selected_path) == os.path.abspath(destination):
        logger.info("Source file already in sources/audios: %s", destination)
        return destination

    if os.path.exists(destination):
        name, ext = os.path.splitext(filename)
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        destination = os.path.join(config.SOURCES_DIR, f"{name}_{timestamp}{ext}")

    shutil.copy2(selected_path, destination)
    logger.info("Copied source file to %s", destination)
    return destination


def _format_timestamp(seconds):
    seconds = max(0, int(round(seconds)))
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


WHISPER_PROGRESS_SHARE = 0.9


def _run_whisper(
    audio_path,
    model_name,
    output_path,
    progress_callback=None,
    on_lines=None,
    on_progress=None,
):
    """Transcribe in fixed-size chunks, appending each chunk's lines to
    output_path as soon as they're ready, so a crash mid-transcription
    doesn't lose everything already processed."""
    import whisper

    _report(progress_callback, f"Loading Whisper model '{model_name}'...")
    model = whisper.load_model(model_name)

    audio = whisper.load_audio(audio_path)
    sample_rate = whisper.audio.SAMPLE_RATE
    chunk_samples = config.CHUNK_DURATION_SECONDS * sample_rate
    total_samples = len(audio)
    total_chunks = max(1, math.ceil(total_samples / chunk_samples))

    open(output_path, "w", encoding="utf-8").close()

    all_segments = []
    running_prompt = None
    detected_language = None

    for chunk_index in range(total_chunks):
        start_sample = chunk_index * chunk_samples
        end_sample = min(start_sample + chunk_samples, total_samples)
        chunk_audio = audio[start_sample:end_sample]
        chunk_offset = start_sample / sample_rate

        _report(
            progress_callback,
            f"Transcribing chunk {chunk_index + 1}/{total_chunks}...",
        )

        result = model.transcribe(
            chunk_audio,
            verbose=True,
            initial_prompt=running_prompt,
            language=detected_language,
        )

        if detected_language is None:
            detected_language = result.get("language")

        chunk_segments = []
        for segment in result.get("segments", []):
            chunk_segments.append(
                {
                    **segment,
                    "start": segment["start"] + chunk_offset,
                    "end": segment["end"] + chunk_offset,
                }
            )

        all_segments.extend(chunk_segments)

        new_lines = build_transcript_lines(chunk_segments, None)
        if new_lines:
            with open(output_path, "a", encoding="utf-8") as f:
                f.write("\n".join(new_lines) + "\n")
            if on_lines:
                on_lines(new_lines)

        if result.get("text", "").strip():
            running_prompt = result["text"].strip()[-224:]

        logger.info(
            "Chunk %d/%d transcribed (%d segment(s)), saved to %s",
            chunk_index + 1,
            total_chunks,
            len(chunk_segments),
            output_path,
        )

        if on_progress:
            on_progress((chunk_index + 1) / total_chunks * WHISPER_PROGRESS_SHARE)

    logger.info("Whisper produced %d segment(s) total", len(all_segments))
    return all_segments


def _run_diarization(audio_path, hf_token, progress_callback=None):
    if not hf_token:
        _report(progress_callback, "No Hugging Face token provided, skipping speaker identification.")
        return None

    try:
        from pyannote.audio import Pipeline
    except ImportError:
        _report(progress_callback, "pyannote.audio is not installed, skipping speaker identification.")
        return None

    try:
        import torch
        import whisper as whisper_audio

        _report(progress_callback, "Loading speaker diarization model...")

        pipeline = Pipeline.from_pretrained(
            config.DIARIZATION_MODEL, token=hf_token
        )

        if torch.cuda.is_available():
            pipeline.to(torch.device("cuda"))
            logger.info("Speaker diarization running on GPU (%s)", torch.cuda.get_device_name(0))

        _report(progress_callback, "Identifying speakers...")

        # Decode audio via Whisper's ffmpeg-based loader instead of letting
        # pyannote decode the file itself: pyannote.audio 4.x decodes audio
        # through torchcodec, which requires FFmpeg's shared libraries (DLLs)
        # to be discoverable at runtime and fails on setups that only have
        # the ffmpeg CLI (the whisper.transcribe() codepath doesn't hit
        # this, since it shells out to ffmpeg directly instead of going
        # through torchcodec).
        waveform = torch.from_numpy(whisper_audio.load_audio(audio_path)).unsqueeze(0)
        diarization = pipeline(
            {"waveform": waveform, "sample_rate": whisper_audio.audio.SAMPLE_RATE}
        )

        # pyannote.audio >=4.0 wraps the result in a DiarizeOutput dataclass
        # instead of returning the Annotation directly. Prefer
        # exclusive_speaker_diarization (no overlapping speaker turns) since
        # we're matching it against non-overlapping Whisper segments.
        annotation = getattr(
            diarization,
            "exclusive_speaker_diarization",
            getattr(diarization, "speaker_diarization", diarization),
        )

        turns = []
        for turn, _, speaker in annotation.itertracks(yield_label=True):
            turns.append((turn.start, turn.end, speaker))
            logger.info(
                "Speaker turn: %s from %.1fs to %.1fs", speaker, turn.start, turn.end
            )

        logger.info("Diarization found %d speaker turn(s)", len(turns))
        return turns
    except Exception:
        logger.exception("Speaker identification failed, keeping transcript without speaker labels")
        _report(
            progress_callback,
            "Speaker identification failed, keeping transcript without speaker labels.",
        )
        return None


def _speaker_for_segment(start, end, turns):
    if not turns:
        return None

    best_speaker = None
    best_overlap = 0.0
    for turn_start, turn_end, speaker in turns:
        overlap = min(end, turn_end) - max(start, turn_start)
        if overlap > best_overlap:
            best_overlap = overlap
            best_speaker = speaker

    return best_speaker


def build_transcript_lines(segments, turns):
    lines = []
    for segment in segments:
        start = segment["start"]
        end = segment["end"]
        text = segment["text"].strip()
        speaker = _speaker_for_segment(start, end, turns) or "Speaker 1"

        time_range = f"[{_format_timestamp(start)} - {_format_timestamp(end)}]"
        lines.append(f"{time_range} {speaker}: {text}")

    return lines


_LINE_PATTERN = re.compile(
    r"^\[(\d{2}):(\d{2}):(\d{2}) - (\d{2}):(\d{2}):(\d{2})\] [^:]+: (.*)$"
)


def _parse_transcript_lines(transcript_path):
    segments = []
    with open(transcript_path, "r", encoding="utf-8") as f:
        for line in f:
            match = _LINE_PATTERN.match(line.rstrip("\n"))
            if not match:
                continue

            h1, m1, s1, h2, m2, s2, text = match.groups()
            segments.append(
                {
                    "start": int(h1) * 3600 + int(m1) * 60 + int(s1),
                    "end": int(h2) * 3600 + int(m2) * 60 + int(s2),
                    "text": text,
                }
            )

    return segments


def reidentify_speakers(
    transcript_path,
    audio_path,
    hf_token,
    progress_callback=None,
    on_lines=None,
):
    """Re-run speaker diarization against an already-transcribed file,
    reusing its existing text/timestamps instead of re-running Whisper.

    Returns the transcript path.
    """
    if not os.path.exists(transcript_path):
        raise TranscriptionError(f"Transcript not found: {transcript_path}")

    if not os.path.exists(audio_path):
        raise TranscriptionError(f"Audio file not found: {audio_path}")

    segments = _parse_transcript_lines(transcript_path)
    if not segments:
        raise TranscriptionError(f"Could not parse any lines from {transcript_path}")

    logger.info(
        "Re-running speaker identification for %s using %s (%d segment(s))",
        transcript_path,
        audio_path,
        len(segments),
    )

    turns = _run_diarization(audio_path, hf_token, progress_callback)
    if not turns:
        raise TranscriptionError(
            "Speaker identification did not find any speakers. Check the log for details."
        )

    lines = build_transcript_lines(segments, turns)
    with open(transcript_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + ("\n" if lines else ""))

    if on_lines:
        on_lines(lines, replace=True)

    _report(progress_callback, "Done.")
    logger.info("Re-applied speaker labels to %s", transcript_path)

    return transcript_path


def _reserve_output_path(audio_path):
    basename = os.path.splitext(os.path.basename(audio_path))[0]
    output_path = os.path.join(config.TRANSCRIPTIONS_DIR, f"{basename}.txt")

    if os.path.exists(output_path):
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        output_path = os.path.join(
            config.TRANSCRIPTIONS_DIR, f"{basename}_{timestamp}.txt"
        )

    return output_path


def transcribe(
    audio_path,
    whisper_model=config.DEFAULT_WHISPER_MODEL,
    hf_token=None,
    progress_callback=None,
    on_lines=None,
    on_progress=None,
):
    """Transcribe an audio file, identify speakers when possible, and save
    the result as a .txt file in the transcriptions folder.

    The transcript is written incrementally as each chunk of audio is
    processed, so progress up to a crash is never lost. Once speaker
    diarization finishes, the file is rewritten once with speaker labels.

    on_lines, if given, is called with (new_lines: list[str]) as each chunk
    is transcribed, and once more with (final_lines, replace=True) after
    speaker labels are applied, so a caller (e.g. a GUI) can mirror the
    transcript live.

    on_progress, if given, is called with a float in [0, 1] tracking overall
    completion (0.9 reserved for the Whisper chunks, the rest for speaker
    diarization and saving), so a caller can drive a determinate progress
    bar instead of an indeterminate spinner.

    Returns the path to the generated transcript file.
    """
    config.ensure_directories()

    if not os.path.exists(audio_path):
        raise TranscriptionError(f"Audio file not found: {audio_path}")

    logger.info("Starting transcription of %s (model=%s)", audio_path, whisper_model)

    output_path = _reserve_output_path(audio_path)

    if on_progress:
        on_progress(0.0)

    segments = _run_whisper(
        audio_path, whisper_model, output_path, progress_callback, on_lines, on_progress
    )
    turns = _run_diarization(audio_path, hf_token, progress_callback)

    if turns:
        _report(progress_callback, "Applying speaker labels...")
        lines = build_transcript_lines(segments, turns)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + ("\n" if lines else ""))
        if on_lines:
            on_lines(lines, replace=True)

    if on_progress:
        on_progress(1.0)

    _report(progress_callback, "Done.")
    logger.info("Transcript saved to %s", output_path)

    return output_path
