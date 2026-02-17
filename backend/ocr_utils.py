import io
import base64
import requests
import os
import json
import logging
from PIL import Image
import pdfplumber

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Lazy-initialized Gemini client for OCR
_ocr_client = None


def _get_ocr_client():
    """Get or create a Gemini client for OCR.
    Uses OAuth credentials from env vars (GOOGLE_OAUTH_REFRESH_TOKEN etc.).
    Falls back to API key if OAuth is not available.
    """
    global _ocr_client
    if _ocr_client is not None:
        return _ocr_client

    # Try OAuth from env vars (replaces token.json + client_secret.json)
    refresh_token = os.getenv("GOOGLE_OAUTH_REFRESH_TOKEN")
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")

    if refresh_token and client_id and client_secret:
        try:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request

            creds = Credentials(
                token=None,
                refresh_token=refresh_token,
                client_id=client_id,
                client_secret=client_secret,
                token_uri="https://oauth2.googleapis.com/token",
            )
            creds.refresh(Request())

            project_id = os.getenv("GCP_PROJECT_ID", "gen-lang-client-0151448461")
            location = os.getenv("GCP_LOCATION", "us-central1")

            _ocr_client = genai.Client(
                vertexai=True,
                project=project_id,
                location=location,
                credentials=creds,
            )
            logger.info("[OCR] Using OAuth/Vertex AI client (from env vars)")
            return _ocr_client
        except Exception as e:
            logger.warning("[OCR] OAuth init failed, falling back to API key: %s", e)

    # Fallback to API key
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise RuntimeError("No GOOGLE_OAUTH_REFRESH_TOKEN or GOOGLE_API_KEY — cannot perform OCR")
    _ocr_client = genai.Client(api_key=api_key)
    logger.info("[OCR] Using API key client")
    return _ocr_client


def extract_text_from_url(url: str) -> str:
    """Download file from URL and extract text."""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        content = response.content
        
        # Get filename/extension from URL or response headers
        filename = url.split("/")[-1].split("?")[0]
        content_type = response.headers.get("Content-Type", "")
        
        return extract_text_from_bytes(content, filename, content_type)
    except Exception as e:
        logger.error(f"Failed to extract text from URL {url}: {e}")
        return f"[Extraction error: {str(e)}]"

def extract_text_from_bytes(content: bytes, filename: str = "", content_type: str = "") -> str:
    """Extract text from bytes (PDF or Image)."""
    try:
        # 1. Handle PDF
        if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
            try:
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    text_parts = []
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(page_text)
                    return "\n\n".join(text_parts)[:10000]
            except Exception as pdf_err:
                logger.warning(f"PDF extraction failed: {pdf_err}")
                return f"[PDF extraction error: {str(pdf_err)}]"
        
        # 2. Handle Image — use Gemini Vision
        is_image = content_type.startswith("image/") if content_type else any(
            filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff"]
        )
        if is_image:
            try:
                # Determine the MIME type
                mime_type = content_type if content_type else "image/png"
                if not mime_type.startswith("image/"):
                    mime_type = "image/png"

                client = _get_ocr_client()
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[
                        types.Content(
                            parts=[
                                types.Part(
                                    inline_data=types.Blob(
                                        data=content,
                                        mime_type=mime_type,
                                    )
                                ),
                                types.Part(
                                    text="Extract ALL text from this image exactly as written. "
                                    "Preserve the original formatting, layout, and structure as much as possible. "
                                    "If there are tables, preserve them. If there are headers, preserve them. "
                                    "Return ONLY the extracted text, nothing else."
                                ),
                            ]
                        )
                    ],
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=4000,
                    ),
                )
                extracted = response.text.strip() if response.text else ""
                return extracted[:10000] if extracted else "[No text found in image]"
            except Exception as ocr_err:
                logger.warning(f"Gemini Vision OCR failed: {ocr_err}")
                return f"[OCR error: {str(ocr_err)}]"
        
        # 3. Fallback to generic text
        try:
            return content.decode("utf-8", errors="ignore")[:10000]
        except:
            return "[Unsupported file format for text extraction]"

    except Exception as e:
        logger.error(f"General extraction error: {e}")
        return f"[General extraction error: {str(e)}]"
