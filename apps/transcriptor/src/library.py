import logging
import os
import platform
import subprocess
from datetime import datetime

from src import config

logger = logging.getLogger(__name__)


def list_transcriptions():
    config.ensure_directories()

    entries = []
    for filename in os.listdir(config.TRANSCRIPTIONS_DIR):
        if not filename.lower().endswith(".txt"):
            continue

        path = os.path.join(config.TRANSCRIPTIONS_DIR, filename)
        modified = datetime.fromtimestamp(os.path.getmtime(path))
        entries.append(
            {
                "filename": filename,
                "path": path,
                "modified": modified.strftime("%Y-%m-%d %H:%M"),
            }
        )

    entries.sort(key=lambda entry: entry["modified"], reverse=True)
    logger.info("Found %d transcription(s) in the library", len(entries))
    return entries


def find_matching_audio(transcript_path):
    """Look for an audio file in sources/audios/ sharing the transcript's
    basename (regardless of extension). Returns None if there's no
    unambiguous match, so the caller can fall back to asking the user."""
    config.ensure_directories()

    basename = os.path.splitext(os.path.basename(transcript_path))[0]

    matches = []
    for filename in os.listdir(config.SOURCES_DIR):
        name, ext = os.path.splitext(filename)
        if name == basename and ext.lower() in config.SUPPORTED_AUDIO_EXTENSIONS:
            matches.append(os.path.join(config.SOURCES_DIR, filename))

    if len(matches) == 1:
        return matches[0]

    return None


def open_containing_folder(path):
    folder = os.path.dirname(path)
    system = platform.system()

    logger.info("Opening folder %s", folder)

    if system == "Windows":
        os.startfile(folder)
    elif system == "Darwin":
        subprocess.Popen(["open", folder])
    else:
        subprocess.Popen(["xdg-open", folder])
