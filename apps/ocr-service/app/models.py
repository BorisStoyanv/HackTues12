from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    processed = "processed"
    failed = "failed"


class RuleStatus(str, Enum):
    passed = "passed"
    failed = "failed"
    warning = "warning"
    skipped = "skipped"


class ValueWithConfidence(BaseModel):
    value: Any
    confidence: float = Field(ge=0.0, le=1.0)


class Summary(BaseModel):
    is_valid: bool
    is_suspicious: bool
    overall_confidence: float = Field(ge=0.0, le=1.0)


class ValidationRuleResult(BaseModel):
    rule: str
    status: RuleStatus
    details: str | None = None


class ErrorPayload(BaseModel):
    code: str
    message: str
    retryable: bool = False


class MetadataPayload(BaseModel):
    pages: int = 0
    mime_type: str
    filename: str
    processor_version: str
    received_at: datetime
    classification_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    extraction_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    ocr_confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class UnifiedDocumentResponse(BaseModel):
    document_id: str
    status: DocumentStatus
    document_type: str
    subtype: str | None = None
    summary: Summary
    common_fields: dict[str, ValueWithConfidence] = Field(default_factory=dict)
    document_specific_fields: dict[str, ValueWithConfidence] = Field(default_factory=dict)
    validation_results: list[ValidationRuleResult] = Field(default_factory=list)
    artifacts: dict[str, Any] = Field(default_factory=dict)
    metadata: MetadataPayload
    error: ErrorPayload | None = None


class JobStatusResponse(BaseModel):
    job_id: str
    document_id: str
    status: DocumentStatus
    result: UnifiedDocumentResponse | None = None
    error: ErrorPayload | None = None


class UploadAcceptedResponse(BaseModel):
    document_id: str
    job_id: str
    status: DocumentStatus


class BatchDocumentResponse(BaseModel):
    items: list[UnifiedDocumentResponse]


class BatchUploadAcceptedResponse(BaseModel):
    items: list[UploadAcceptedResponse]


class ExtractedField(BaseModel):
    value: Any
    confidence: float = Field(ge=0.0, le=1.0)


class ExtractionResult(BaseModel):
    document_type: str
    subtype: str | None = None
    classification_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    extraction_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    document_type_hint: str | None = None
    classification_reason: str | None = None
    common_fields: dict[str, ExtractedField] = Field(default_factory=dict)
    document_specific_fields: dict[str, ExtractedField] = Field(default_factory=dict)


class LlmReviewResult(BaseModel):
    resolved_document_type: str | None = None
    subtype: str | None = None
    degree: str | None = None
    degree_level: str | None = None
    full_name: str | None = None
    issuing_organization: str | None = None
    graduation_date: str | None = None
    issue_date: str | None = None
    is_suspicious: bool = False
    internally_consistent: bool = True
    requires_manual_review: bool = False
    suspicion_reasons: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    model: str | None = None


class OcrArtifacts(BaseModel):
    raw_text: str
    pages: int
    raw_ocr: dict[str, Any] = Field(default_factory=dict)
    ocr_confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ProcessingFailure(Exception):
    def __init__(self, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.payload = ErrorPayload(code=code, message=message, retryable=retryable)
