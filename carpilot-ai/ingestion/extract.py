"""Text extraction from PDFs and images."""

from __future__ import annotations

import io
import logging

from langsmith import traceable

logger = logging.getLogger(__name__)


@traceable(name="extract_text", run_type="tool")
def extract_text(filename: str, content: bytes, content_type: str | None = None) -> str:
    """Extract raw text from an uploaded document.

    Supports PDF (pypdf) and common image types (optional pytesseract OCR).
    Raises on hard failures so the ingestion pipeline can fail closed.
    """
    name = (filename or "").lower()
    ctype = (content_type or "").lower()

    if name.endswith(".pdf") or "pdf" in ctype:
        return _extract_pdf(content)
    if name.endswith((".txt", ".md", ".csv")) or ctype.startswith("text/"):
        return content.decode("utf-8", errors="replace")
    if name.endswith((".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff")) or ctype.startswith(
        "image/"
    ):
        return _extract_image(content)

    # Last resort: try PDF then plain text decode.
    try:
        return _extract_pdf(content)
    except Exception:  # noqa: BLE001
        return content.decode("utf-8", errors="replace")


def _extract_pdf(content: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    text = "\n".join(pages).strip()
    if not text:
        raise ValueError("PDF contained no extractable text")
    return text


def _extract_image(content: bytes) -> str:
    try:
        from PIL import Image
        import pytesseract
    except ImportError as exc:
        raise ValueError(
            "Image OCR requires Pillow and pytesseract; install them or upload a PDF/text file."
        ) from exc

    image = Image.open(io.BytesIO(content))
    text = pytesseract.image_to_string(image).strip()
    if not text:
        raise ValueError("OCR produced no text from image")
    return text
