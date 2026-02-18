# ─── Parchi Backend ───────────────────────────────────────
# Python 3.12 slim image for a lean container
FROM python:3.12-slim AS base

# Install system deps needed by pytesseract, pdfplumber (poppler), Pillow, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ─── Dependencies layer (cached unless requirements.txt changes) ──
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── Application code ─────────────────────────────────────
COPY . .

# Expose the port the backend listens on
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
