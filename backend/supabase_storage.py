"""
Supabase Storage helper for Parchi.ai.
Handles file uploads to Supabase Storage buckets.
"""

import logging
from database import get_supabase

logger = logging.getLogger(__name__)

BUCKET_NAME = "documents"


def ensure_bucket_exists() -> None:
    """Create the patient-documents bucket if it doesn't already exist."""
    client = get_supabase()
    try:
        client.storage.get_bucket(BUCKET_NAME)
        logger.info("Storage bucket '%s' already exists", BUCKET_NAME)
    except Exception:
        try:
            client.storage.create_bucket(BUCKET_NAME, options={"public": True})
            logger.info("Created storage bucket '%s'", BUCKET_NAME)
        except Exception as e:
            logger.warning("Could not create bucket '%s': %s", BUCKET_NAME, e)


def upload_file(file_bytes: bytes, file_path: str, content_type: str = "application/octet-stream") -> str:
    """Upload a file to Supabase Storage and return its public URL.

    Args:
        file_bytes: Raw file content.
        file_path: Path within the bucket (e.g. "p-abc123/report.pdf").
        content_type: MIME type of the file.

    Returns:
        The public URL of the uploaded file.
    """
    client = get_supabase()
    client.storage.from_(BUCKET_NAME).upload(
        path=file_path,
        file=file_bytes,
        file_options={"content-type": content_type},
    )
    public_url = client.storage.from_(BUCKET_NAME).get_public_url(file_path)
    logger.info("Uploaded file to %s/%s", BUCKET_NAME, file_path)
    return public_url
