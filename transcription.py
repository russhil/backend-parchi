"""
Whisper transcription service for Parchi.ai.
Uses OpenAI Whisper API to transcribe audio from consult recordings.
"""

import io
import os
from openai import OpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

_client: OpenAI | None = None

# Whisper API max file size is 25MB
MAX_CHUNK_SIZE = 25 * 1024 * 1024


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set in environment")
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def transcribe_audio(audio_bytes: bytes, filename: str, language: str = "en") -> str:
    """Transcribe audio bytes using OpenAI Whisper API.

    Args:
        audio_bytes: Raw audio file bytes.
        filename: Original filename (used for MIME type detection).
        language: ISO-639-1 language code, defaults to English.

    Returns:
        Transcribed text string.
    """
    client = _get_client()

    if len(audio_bytes) <= MAX_CHUNK_SIZE:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language,
        )
        return response.text

    # For files > 25MB, chunk using pydub
    return _transcribe_chunked(audio_bytes, filename, language)


def _transcribe_chunked(audio_bytes: bytes, filename: str, language: str) -> str:
    """Split large audio into chunks and transcribe each."""
    from pydub import AudioSegment

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webm"
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=ext)

    # 10-minute chunks
    chunk_duration_ms = 10 * 60 * 1000
    chunks = [audio[i:i + chunk_duration_ms] for i in range(0, len(audio), chunk_duration_ms)]

    client = _get_client()
    transcripts = []

    for i, chunk in enumerate(chunks):
        buf = io.BytesIO()
        chunk.export(buf, format="mp3")
        buf.name = f"chunk_{i}.mp3"
        buf.seek(0)

        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=buf,
            language=language,
        )
        transcripts.append(response.text)

    return " ".join(transcripts)
