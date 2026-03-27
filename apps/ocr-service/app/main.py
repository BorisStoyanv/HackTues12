from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Annotated
from uuid import uuid4

import pytesseract
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .models import (
    DocumentStatus,
    ErrorPayload,
    ExtractedField,
    JobStatusResponse,
    ProcessingFailure,
    UnifiedDocumentResponse,
    UploadAcceptedResponse,
)
from .openrouter import review_document_text
from .pipeline import (
    build_failed_response,
    build_response,
    build_validation_results,
    classify_and_extract,
    ensure_supported_type,
    extract_ocr_artifacts,
)

settings = get_settings()
if settings.resolved_tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = settings.resolved_tesseract_cmd

logger = logging.getLogger(__name__)
app = FastAPI(title="HackTues OCR Service", version=settings.processor_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class ProcessingJob:
    job_id: str
    document_id: str
    status: DocumentStatus
    result: UnifiedDocumentResponse | None = None
    error: ErrorPayload | None = None


DOCUMENTS: dict[str, UnifiedDocumentResponse] = {}
JOBS: dict[str, ProcessingJob] = {}
STORE_LOCK = asyncio.Lock()


@app.get("/healthz")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/documents", response_model=UnifiedDocumentResponse | UploadAcceptedResponse)
async def upload_document(
    response: Response,
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File(...)],
    sync: Annotated[bool | None, Query()] = None,
    document_type_hint: Annotated[str | None, Form()] = None,
    external_id: Annotated[str | None, Form()] = None,
) -> UnifiedDocumentResponse | UploadAcceptedResponse:
    del external_id

    file_bytes = await file.read()
    if len(file_bytes) > settings.max_file_size_bytes:
        raise _http_error(
            "FILE_TOO_LARGE",
            f"File exceeds the {settings.max_file_size_mb} MB upload limit.",
            retryable=False,
            status_code=413,
        )

    try:
        mime_type = ensure_supported_type(file.content_type)
    except ProcessingFailure as exc:
        payload = exc.payload
        raise _http_error(payload.code, payload.message, payload.retryable, 415) from exc

    document_id = f"doc_{uuid4().hex[:12]}"
    job_id = f"job_{uuid4().hex[:12]}"
    should_process_sync = settings.default_sync if sync is None else sync

    async with STORE_LOCK:
        JOBS[job_id] = ProcessingJob(
            job_id=job_id,
            document_id=document_id,
            status=DocumentStatus.processing if should_process_sync else DocumentStatus.queued,
        )

    if should_process_sync:
        response.status_code = 200
        return await _process_document(
            document_id=document_id,
            job_id=job_id,
            filename=file.filename or "upload",
            mime_type=mime_type,
            file_bytes=file_bytes,
            document_type_hint=document_type_hint,
        )

    background_tasks.add_task(
        _process_document,
        document_id,
        job_id,
        file.filename or "upload",
        mime_type,
        file_bytes,
        document_type_hint,
    )
    response.status_code = 202
    return UploadAcceptedResponse(
        document_id=document_id,
        job_id=job_id,
        status=DocumentStatus.queued,
    )


@app.get("/v1/documents/{document_id}", response_model=UnifiedDocumentResponse)
async def get_document(document_id: str) -> UnifiedDocumentResponse:
    async with STORE_LOCK:
        document = DOCUMENTS.get(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="document not found")
    return document


@app.get("/v1/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: str) -> JobStatusResponse:
    async with STORE_LOCK:
        job = JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return JobStatusResponse(
        job_id=job.job_id,
        document_id=job.document_id,
        status=job.status,
        result=job.result,
        error=job.error,
    )


@app.post("/v1/webhooks/test")
async def webhook_test() -> dict[str, bool]:
    return {"received": True}


async def _process_document(
    document_id: str,
    job_id: str,
    filename: str,
    mime_type: str,
    file_bytes: bytes,
    document_type_hint: str | None,
) -> UnifiedDocumentResponse:
    await _update_job(job_id, DocumentStatus.processing)

    try:
        artifacts = extract_ocr_artifacts(file_bytes, mime_type)
        extraction = classify_and_extract(artifacts.raw_text, document_type_hint=document_type_hint)
        llm_review = None
        if settings.openrouter_enabled and (
            extraction.extraction_confidence < 0.55
            or extraction.document_type in {"diploma", "certificate", "transcript"}
        ):
            try:
                llm_review = await review_document_text(
                    settings=settings,
                    raw_text=artifacts.raw_text,
                    document_type_hint=document_type_hint,
                    detected_document_type=extraction.document_type,
                )
                _merge_llm_review(extraction, llm_review)
            except Exception:
                logger.exception("openrouter review failed for %s", document_id)
                llm_review = None

        validation_results = build_validation_results(extraction, artifacts, llm_review=llm_review)
        result = build_response(
            document_id=document_id,
            filename=filename,
            mime_type=mime_type,
            processor_version=settings.processor_version,
            artifacts=artifacts,
            extraction=extraction,
            validation_results=validation_results,
            llm_review=llm_review,
        )
    except Exception as exc:
        logger.exception("unexpected document processing failure for %s", document_id)
        payload = getattr(exc, "payload", ErrorPayload(code="INTERNAL_ERROR", message="Unexpected processing failure", retryable=True))
        result = build_failed_response(
            document_id=document_id,
            filename=filename,
            mime_type=mime_type,
            processor_version=settings.processor_version,
            error=payload,
            document_type_hint=document_type_hint,
        )
        async with STORE_LOCK:
            DOCUMENTS[document_id] = result
            JOBS[job_id].status = DocumentStatus.failed
            JOBS[job_id].result = result
            JOBS[job_id].error = payload
        return result

    async with STORE_LOCK:
        DOCUMENTS[document_id] = result
        JOBS[job_id].status = DocumentStatus.processed
        JOBS[job_id].result = result
        JOBS[job_id].error = None
    return result


async def _update_job(job_id: str, status: DocumentStatus) -> None:
    async with STORE_LOCK:
        if job_id in JOBS:
            JOBS[job_id].status = status


def _http_error(code: str, message: str, retryable: bool, status_code: int) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message, "retryable": retryable},
    )


def _merge_llm_review(extraction, llm_review) -> None:
    if not llm_review:
        return

    if llm_review.resolved_document_type and extraction.document_type == "generic_document":
        extraction.document_type = llm_review.resolved_document_type
    if llm_review.subtype and not extraction.subtype:
        extraction.subtype = llm_review.subtype

    common_candidates = {
        "full_name": llm_review.full_name,
        "issuing_organization": llm_review.issuing_organization,
        "issue_date": llm_review.issue_date,
    }
    for field_name, value in common_candidates.items():
        if value and field_name not in extraction.common_fields:
            extraction.common_fields[field_name] = ExtractedField(
                value=value,
                confidence=llm_review.confidence,
            )

    specific_candidates = {
        "degree": llm_review.degree,
        "degree_level": llm_review.degree_level,
        "graduation_date": llm_review.graduation_date,
    }
    for field_name, value in specific_candidates.items():
        if value and field_name not in extraction.document_specific_fields:
            extraction.document_specific_fields[field_name] = ExtractedField(
                value=value,
                confidence=llm_review.confidence,
            )

    extraction.extraction_confidence = max(extraction.extraction_confidence, llm_review.confidence)
