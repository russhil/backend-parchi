import io
import requests
import os
import logging
from PIL import Image
import pytesseract
import pdfplumber

logger = logging.getLogger(__name__)

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
        
        # 2. Handle Image
        is_image = content_type.startswith("image/") or any(
            filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff"]
        )
        if is_image:
            try:
                image = Image.open(io.BytesIO(content))
                text = pytesseract.image_to_string(image)
                return text[:10000]
            except Exception as ocr_err:
                logger.warning(f"OCR failed: {ocr_err}")
                return f"[OCR error: {str(ocr_err)}]"
        
        # 3. Fallback to generic text
        try:
            return content.decode("utf-8", errors="ignore")[:10000]
        except:
            return "[Unsupported file format for text extraction]"

    except Exception as e:
        logger.error(f"General extraction error: {e}")
        return f"[General extraction error: {str(e)}]"
