import logging
import os
import sys

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )

SOURCES_DIR = os.path.join(APP_DIR, "sources", "audios")
TRANSCRIPTIONS_DIR = os.path.join(APP_DIR, "transcriptions")
HF_TOKEN_FILE = os.path.join(APP_DIR, ".hf_token")

DEFAULT_WHISPER_MODEL = "medium"
DIARIZATION_MODEL = "pyannote/speaker-diarization-3.1"
CHUNK_DURATION_SECONDS = 60

SUPPORTED_AUDIO_EXTENSIONS = (
    ".wav", ".mp3", ".m4a", ".flac", ".ogg", ".wma", ".aac", ".mp4"
)


def ensure_directories():
    os.makedirs(SOURCES_DIR, exist_ok=True)
    os.makedirs(TRANSCRIPTIONS_DIR, exist_ok=True)


def load_hf_token():
    if os.path.exists(HF_TOKEN_FILE):
        with open(HF_TOKEN_FILE, "r", encoding="utf-8") as f:
            token = f.read().strip()
            if token:
                return token

    return os.environ.get("HF_TOKEN", "")


def save_hf_token(token):
    token = (token or "").strip()

    if not token:
        if os.path.exists(HF_TOKEN_FILE):
            os.remove(HF_TOKEN_FILE)
        return

    with open(HF_TOKEN_FILE, "w", encoding="utf-8") as f:
        f.write(token)
