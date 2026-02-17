"""
Consult Transcription Module for Parchi.ai
Stripped-down Gemini Live session for transcription-only mode (no voice responses).
Uses input_audio_transcription to convert doctor speech to text in real-time.
"""

import asyncio
import logging
import os
import traceback

from google import genai
from google.genai import types

# Configure detailed logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

TRANSCRIBER_SYSTEM_INSTRUCTION = """You are a passive medical transcription assistant for Parchi.ai.
Your ONLY job is to listen to the doctor-patient consultation and produce accurate transcription.
Do NOT respond, ask questions, or provide medical advice. Just transcribe what you hear.

IMPORTANT: Transcribe in the correct script for the language spoken:
- English speech must be transcribed in Latin script (English text)
- Hindi speech must be transcribed in Devanagari script (हिंदी text)
- Do NOT transliterate English words into Devanagari script

If speech is unclear, transcribe your best interpretation and mark uncertain parts with [inaudible].
Use proper medical terminology where appropriate."""


class ConsultTranscriber:
    """Handles Gemini Live API session for transcription-only mode."""

    def __init__(self, project_id=None, location=None, model=None, input_sample_rate=16000, api_key=None):
        self.project_id = project_id
        self.location = location
        self.model = model
        self.input_sample_rate = input_sample_rate

        logger.debug("ConsultTranscriber.__init__: project_id=%s, location=%s, model=%s, api_key=%s",
                     project_id, location, model, "***" if api_key else None)

        if api_key:
            logger.info("ConsultTranscriber: Using API key auth")
            # Set environment variable for genai.Client to use
            os.environ["GOOGLE_API_KEY"] = api_key
            self.client = genai.Client()
            logger.debug("ConsultTranscriber: Client created with API key from environment")
        else:
            logger.info("ConsultTranscriber: Using Vertex AI auth (project=%s, location=%s)", project_id, location)
            self.client = genai.Client(vertexai=True, project=project_id, location=location)
            logger.debug("ConsultTranscriber: Client created with Vertex AI")

    async def start_session(self, audio_input_queue: asyncio.Queue):
        """Start a transcription-only Gemini Live session.

        Yields {"type": "transcript", "text": "..."} events as speech is recognized.
        Send None to audio_input_queue to stop the session.
        """
        logger.debug("ConsultTranscriber.start_session: Creating config for model=%s", self.model)

        # Use AUDIO modality like "Talk to Me" - required for voice transcription
        # We'll just ignore the audio output and only use the transcriptions
        config = {
            "response_modalities": ["AUDIO"],  # Required for voice features
            "system_instruction": {
                "parts": [{"text": TRANSCRIBER_SYSTEM_INSTRUCTION}]
            },
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": "Aoede"
                    }
                }
            },
            # Enable transcription of user audio input
            # Note: language_code and enable_automatic_punctuation are not supported
            # The API auto-detects language and handles punctuation automatically
            "input_audio_transcription": {},
            "output_audio_transcription": {},  # Enable transcription of AI responses
        }

        logger.info("ConsultTranscriber: Connecting to model=%s with config=%s", self.model, config)
        logger.debug("ConsultTranscriber: Client type=%s", type(self.client))

        try:
            logger.debug("ConsultTranscriber: Entering async context manager...")
            async with self.client.aio.live.connect(model=self.model, config=config) as session:
                logger.info("ConsultTranscriber: ✓ Session established successfully!")
                event_queue = asyncio.Queue()

                async def send_audio():
                    try:
                        logger.debug("send_audio: Starting audio send loop")
                        while True:
                            chunk = await audio_input_queue.get()
                            if chunk is None:
                                logger.debug("send_audio: Received stop sentinel")
                                break
                            logger.debug("send_audio: Sending %d bytes of audio", len(chunk))
                            await session.send_realtime_input(
                                audio=types.Blob(data=chunk, mime_type=f"audio/pcm;rate={self.input_sample_rate}")
                            )
                    except asyncio.CancelledError:
                        logger.debug("send_audio: Cancelled")
                    except Exception as e:
                        logger.error("send_audio: Error: %s", e, exc_info=True)

                async def receive_loop():
                    try:
                        logger.debug("receive_loop: Starting receive loop")
                        while True:
                            async for response in session.receive():
                                logger.debug("receive_loop: Received response type=%s", type(response))
                                server_content = response.server_content
                                if not server_content:
                                    logger.debug("receive_loop: No server_content, skipping")
                                    continue

                                # Get user input transcription
                                if server_content.input_transcription and server_content.input_transcription.text:
                                    text = server_content.input_transcription.text
                                    logger.info("receive_loop: ✓ User Transcription: %s", text)
                                    await event_queue.put({
                                        "type": "transcript",
                                        "text": text,
                                    })

                                # Ignore audio output (we only want transcription)
                                if server_content.model_turn:
                                    for part in server_content.model_turn.parts:
                                        if part.inline_data:
                                            logger.debug("receive_loop: Ignoring audio output (%d bytes)", len(part.inline_data.data))
                                            # Don't send audio - we only want text transcription

                                if server_content.turn_complete:
                                    logger.debug("receive_loop: Turn complete")
                                    await event_queue.put({"type": "turn_complete"})

                    except Exception as e:
                        logger.error("ConsultTranscriber: receive_loop error: %s", e, exc_info=True)
                        logger.error("Traceback: %s", traceback.format_exc())
                        await event_queue.put({"type": "error", "error": str(e)})
                    finally:
                        logger.debug("receive_loop: Exiting")
                        await event_queue.put(None)

                logger.debug("ConsultTranscriber: Creating async tasks")
                send_task = asyncio.create_task(send_audio())
                receive_task = asyncio.create_task(receive_loop())

                logger.debug("ConsultTranscriber: Starting event loop")
                try:
                    while True:
                        event = await event_queue.get()
                        if event is None:
                            logger.debug("ConsultTranscriber: Event loop terminated")
                            break
                        if isinstance(event, dict) and event.get("type") == "error":
                            logger.error("ConsultTranscriber: Yielding error event: %s", event)
                            yield event
                            break
                        logger.debug("ConsultTranscriber: Yielding event: %s", event.get("type") if isinstance(event, dict) else event)
                        yield event
                finally:
                    logger.debug("ConsultTranscriber: Cancelling tasks")
                    send_task.cancel()
                    receive_task.cancel()
        except Exception as e:
            logger.error("ConsultTranscriber: ✗ Failed to establish session: %s", e)
            logger.error("Full traceback: %s", traceback.format_exc())
            yield {"type": "error", "error": f"Failed to connect to Gemini Live: {e}"}
