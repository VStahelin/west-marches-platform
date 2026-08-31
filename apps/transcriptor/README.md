# Transcriptor

A desktop tool that transcribes audio files (Portuguese and English) using
[OpenAI Whisper](https://github.com/openai/whisper), with optional speaker
identification and timestamps.

## Features

- Transcribes speech in Portuguese and English (auto-detected by Whisper).
- Identifies speakers ("who spoke when") using `pyannote.audio`, when a
  Hugging Face token is provided.
- Splits the transcript into timestamped segments.
- Saves progress incrementally: audio is processed in 60-second chunks (see
  `CHUNK_DURATION_SECONDS` in `src/config.py`), and each chunk's text is
  appended to the `.txt` file as soon as it's ready, so a crash mid-run only
  loses the current chunk, not the whole transcription.
- Saves the selected audio file into `sources/audios/`.
- Exports the transcript as a `.txt` file into `transcriptions/`.
- GUI to pick an audio file, run a transcription, and browse the library of
  transcriptions already generated, with an "Open file folder" shortcut.
- The GUI shows a determinate progress bar (based on chunks completed) and a
  live transcript panel that fills in as each chunk is transcribed.

## Requirements

- Python 3.9+
- [ffmpeg](https://ffmpeg.org/download.html) installed and available on your
  `PATH` (required by Whisper).
- A Hugging Face account and access token if you want speaker
  identification. Accept the user agreement for
  [`pyannote/speaker-diarization-3.1`](https://huggingface.co/pyannote/speaker-diarization-3.1),
  [`pyannote/segmentation-3.0`](https://huggingface.co/pyannote/segmentation-3.0),
  and [`pyannote/speaker-diarization-community-1`](https://huggingface.co/pyannote/speaker-diarization-community-1)
  (pulled in internally by newer `pyannote.audio` releases)
  on Hugging Face, then generate a token at
  https://huggingface.co/settings/tokens. Without a token, transcripts are
  still generated but every line is labeled `Speaker 1`.

## Setup

```bash
cd apps/transcriptor
make up
```

`make up` creates the `.venv` virtual environment (if it doesn't exist yet),
installs the dependencies from `requirements.txt`, and launches the app.

Other targets:

- `make venv` — only create the virtual environment.
- `make install` — create the venv (if needed) and install/update dependencies.
- `make run` — launch the app using the existing venv, without reinstalling.
- `make clean` — delete the `.venv` folder.

To set things up manually instead:

```bash
python -m venv .venv
.venv\Scripts\activate   # on Windows
pip install -r requirements.txt
python main.py
```

## Usage

```bash
make up      # or: python main.py, once the venv is set up
```

1. Click **Select audio file** and choose a recording.
2. (Optional) Paste a Hugging Face token to enable speaker identification.
   The token is saved locally (`.hf_token`, gitignored) so you only need to
   enter it once. If you leave it empty, the app warns you before running
   that every line will be labeled `Speaker 1`.
3. Click **Transcribe** and wait for processing to finish.
4. The transcript appears in the library list below; select it and click
   **Open file folder** to reveal it on disk.

The selected audio is copied into `sources/audios/`, and the generated
transcript is written to `transcriptions/<audio-file-name>.txt`, with lines
formatted as:

```
[00:00:00 - 00:00:04] SPEAKER_00: Hello, how are you doing today?
[00:00:05 - 00:00:09] SPEAKER_01: I'm doing great, thanks for asking.
```

## Notes

- Larger Whisper models (`medium`, `large`) are more accurate but slower and
  need more memory. `medium` is the default; switch to `small` or `base` for
  faster results on modest hardware.
- Speaker identification runs entirely locally after the models are
  downloaded; only the initial model download requires the Hugging Face
  token/network access.
