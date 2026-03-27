# OCR Service

This folder contains a standalone OCR and document-extraction API built for the "receive document via API, compute, and return data via API" flow.

It is intentionally stateless:

- no database
- no file persistence
- no object storage
- no schema migrations

The service keeps only short-lived in-memory job/result state so `GET /v1/jobs/{id}` and `GET /v1/documents/{id}` work during the current process lifetime.

## What it does

- accepts PDFs and images via API
- extracts text from digital PDFs first
- falls back to OCR for scanned PDFs and images
- classifies the document with deterministic keyword rules
- maps fields into a unified response envelope
- runs basic integrity and consistency checks
- returns one stable API shape for every document type

## Stack

- FastAPI
- Pydantic
- PyMuPDF
- Pillow
- pytesseract

## Endpoints

- `GET /healthz`
- `POST /v1/documents`
- `GET /v1/documents/{document_id}`
- `GET /v1/jobs/{job_id}`
- `POST /v1/webhooks/test`

## API flow

### Sync mode

Use `?sync=true` to process in the upload request and receive the unified response immediately.

```bash
curl -X POST "http://127.0.0.1:8090/v1/documents?sync=true" \
  -F "file=@sample.pdf" \
  -F "document_type_hint=diploma"
```

### Async mode

Use `?sync=false` to queue in memory and poll the job endpoint.

```bash
curl -X POST "http://127.0.0.1:8090/v1/documents?sync=false" \
  -F "file=@sample.pdf"
```

Response:

```json
{
  "document_id": "doc_123",
  "job_id": "job_456",
  "status": "queued"
}
```

Then poll:

```bash
curl "http://127.0.0.1:8090/v1/jobs/job_456"
```

## Unified response shape

```json
{
  "document_id": "doc_123",
  "status": "processed",
  "document_type": "diploma",
  "subtype": "bachelor_diploma",
  "summary": {
    "is_valid": true,
    "is_suspicious": false,
    "overall_confidence": 0.88
  },
  "common_fields": {},
  "document_specific_fields": {},
  "validation_results": [],
  "artifacts": {
    "raw_text": "...",
    "pages": 1,
    "raw_ocr": {}
  },
  "metadata": {
    "pages": 1,
    "mime_type": "application/pdf",
    "filename": "sample.pdf",
    "processor_version": "hacktues-ocr-v1",
    "received_at": "2026-03-27T12:00:00Z",
    "classification_confidence": 0.9,
    "extraction_confidence": 0.81,
    "ocr_confidence": 0.94
  },
  "error": null
}
```

## Run locally

1. Create a virtual environment.
2. Install dependencies.
3. Make sure the Tesseract binary is installed and available on `PATH`.
4. Start the API.

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e .[dev]
uvicorn app.main:app --reload --host 127.0.0.1 --port 8090
```

## Notes

- Digital PDFs are handled cheaply with direct text extraction first.
- OCR is used only when needed.
- Current extraction is rule-based first so it stays cheap and hackathon-friendly.
- Optional OpenRouter review can recover fields from noisy OCR text and add internal-consistency fraud heuristics when `OCR_SERVICE_OPENROUTER_API_KEY` is set.
- Default OpenRouter model is `google/gemini-2.5-flash-lite`, but you can swap it through `OCR_SERVICE_OPENROUTER_MODEL`.
- This is a solid MVP skeleton for adding better preprocessors, more extractors, queues, or an LLM fallback later without changing the API contract.
