# Document sidecar (Docling + MarkItDown + PaddleOCR)

Optional Python microservice that gives the Node backend heavyweight document
understanding it cannot run in-process. The Express server calls it only when
`SIDECAR_URL` is set; without it the app keeps working with the lighter
built-in parsers (mammoth, DuckDB, Tesseract.js).

## Endpoints

| Route | Purpose |
| --- | --- |
| `GET /health` | Liveness probe |
| `POST /parse` | Multipart `file` → `{markdown, engine}` — Docling first, MarkItDown fallback |
| `POST /ocr` | Multipart `file` (image) → `{text, engine}` — PaddleOCR |

## Run

```bash
cd server/sidecar
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8790
```

Then point the Node server at it:

```bash
SIDECAR_URL=http://127.0.0.1:8790 npm run server
```

## Notes

- First request downloads model weights (Docling layout models, PaddleOCR
  weights, MarkItDown deps are pure Python) — allow a few GB of disk and a
  slow cold start, or pre-warm with `curl -F file=@sample.pdf :8790/parse`.
- `OCR_LANGUAGE` env picks the PaddleOCR language (`en` default; `ch`, `id`,
  etc. per PaddleOCR's language list).
- Keep it on a private network — the service runs untrusted document
  converters; do not expose it publicly without auth in front.
