"""AI Work Studio document sidecar.

Optional Python service that exposes heavyweight document understanding the
Node server cannot run itself:

* POST /parse — Docling first, Microsoft MarkItDown as fallback → markdown
* POST /ocr   — PaddleOCR → plain text
* GET  /health

Run:  uvicorn app:app --host 0.0.0.0 --port 8790
The first request after install downloads model weights (Docling layout
models, PaddleOCR weights) — plan for a few GB of disk on cold boot.
"""

import io
import os
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile

app = FastAPI(title="promptlab-document-sidecar")

_docling_converter = None
_markitdown = None
_paddle_ocr = None


def get_docling():
    global _docling_converter
    if _docling_converter is None:
        from docling.document_converter import DocumentConverter

        _docling_converter = DocumentConverter()
    return _docling_converter


def get_markitdown():
    global _markitdown
    if _markitdown is None:
        from markitdown import MarkItDown

        _markitdown = MarkItDown()
    return _markitdown


def get_paddleocr():
    global _paddle_ocr
    if _paddle_ocr is None:
        from paddleocr import PaddleOCR

        # PP-OCRv5 server models are huge; the mobile line is the better
        # default for a CPU sidecar. OCR_LANGUAGE env can override.
        _paddle_ocr = PaddleOCR(
            lang=os.environ.get("OCR_LANGUAGE", "en"),
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )
    return _paddle_ocr


@app.get("/health")
def health():
    return {"ok": True}


def _write_temp(body: bytes, suffix: str) -> str:
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as handle:
        handle.write(body)
    return path


# Parsing/OCR are CPU-bound blocking calls — plain `def` endpoints run in
# FastAPI's threadpool so one conversion cannot stall every other request.
@app.post("/parse")
def parse(file: UploadFile = File(...)):
    body = file.file.read()
    if not body:
        raise HTTPException(400, "empty file")
    suffix = os.path.splitext(file.filename or "doc.bin")[1] or ".bin"
    errors = []

    # Docling: layout-aware conversion (tables, reading order) for
    # PDF/DOCX/PPTX/XLSX/HTML/images with embedded OCR.
    try:
        converter = get_docling()
        tmp = _write_temp(body, suffix)
        try:
            result = converter.convert(tmp)
        finally:
            os.unlink(tmp)
        markdown = result.document.export_to_markdown()
        if markdown and markdown.strip():
            return {"markdown": markdown, "engine": "docling"}
        errors.append("docling produced empty markdown")
    except Exception as exc:  # noqa: BLE001 - report and fall through
        errors.append(f"docling: {exc}")

    # MarkItDown: lighter universal converter, no layout models.
    try:
        md = get_markitdown()
        tmp = _write_temp(body, suffix)
        try:
            result = md.convert(tmp)
        finally:
            os.unlink(tmp)
        markdown = getattr(result, "text_content", "") or ""
        if markdown.strip():
            return {"markdown": markdown, "engine": "markitdown"}
        errors.append("markitdown produced empty markdown")
    except Exception as exc:  # noqa: BLE001
        errors.append(f"markitdown: {exc}")

    raise HTTPException(422, "; ".join(errors) or "no parser succeeded")


@app.post("/ocr")
def ocr(file: UploadFile = File(...)):
    body = file.file.read()
    if not body:
        raise HTTPException(400, "empty file")
    engine = get_paddleocr()
    try:
        result = engine.ocr(io.BytesIO(body))  # type: ignore[arg-type]
    except Exception:  # noqa: BLE001 - retry on a real path instead
        # Some PaddleOCR releases only accept paths/np arrays, not streams.
        tmp = _write_temp(body, os.path.splitext(file.filename or "img.png")[1] or ".png")
        try:
            result = engine.ocr(tmp)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(500, f"paddleocr failed: {exc}")
        finally:
            os.unlink(tmp)

    lines = []
    for page in result or []:
        # PP-OCR returns per line: [box, (text, score)] or dicts on v5.
        if isinstance(page, dict):
            for text in page.get("rec_texts", []) or []:
                lines.append(str(text))
        else:
            for entry in page or []:
                try:
                    lines.append(str(entry[1][0]))
                except Exception:  # noqa: BLE001
                    continue
    text = "\n".join(line for line in lines if line.strip())
    return {"text": text, "engine": "paddleocr"}
