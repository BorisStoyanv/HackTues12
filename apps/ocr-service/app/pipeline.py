from __future__ import annotations

import io
import re
from datetime import date, datetime, timezone
from typing import Any

import fitz
import pytesseract
from PIL import Image, ImageOps, ImageSequence
from docx import Document as DocxDocument

from .models import (
    ErrorPayload,
    ExtractedField,
    ExtractionResult,
    LlmReviewResult,
    MetadataPayload,
    OcrArtifacts,
    ProcessingFailure,
    RuleStatus,
    Summary,
    UnifiedDocumentResponse,
    ValidationRuleResult,
    ValueWithConfidence,
)

SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
    "image/bmp",
}

COMMON_FIELD_PATTERNS: dict[str, tuple[str, ...]] = {
    "full_name": (r"(?:full\s*name|name)\s*[:\-]\s*(.+)",),
    "document_number": (
        r"(?:document\s*number|document\s*no\.?|certificate\s*number|invoice\s*number|id\s*number)\s*[:\-]\s*([A-Z0-9\-/]+)",
    ),
    "issue_date": (r"(?:issue\s*date|issued\s*on|date\s*issued|date)\s*[:\-]\s*([0-9./-]+)",),
    "issuing_organization": (
        r"(?:issuing\s*organization|issued\s*by|institution|organization|supplier|academy|university)\s*[:\-]\s*(.+)",
    ),
    "full_name_fallback": (
        r"(?:certify\s+that|presented\s+to|awarded\s+to)\s+([A-Z][A-Za-z.' -]{2,})",
    ),
}

DOCUMENT_SPECIFIC_PATTERNS: dict[str, dict[str, tuple[str, ...]]] = {
    "diploma": {
        "degree": (r"(?:degree|qualification)\s*[:\-]\s*(.+)",),
        "degree_title": (r"(?:has\s+(?:successfully\s+)?completed|awarded\s+the)\s+(.+)",),
        "degree_level": (r"\b(bachelor|master|phd|doctorate|associate)\b",),
        "specialization": (r"(?:specialization|major)\s*[:\-]\s*(.+)",),
        "graduation_date": (r"(?:graduation\s*date|graduated\s*on)\s*[:\-]\s*([0-9./-]+)",),
        "gpa": (r"\b(?:gpa|grade)\s*[:\-]\s*([0-9.]+)",),
        "student_id": (r"(?:student\s*id|faculty\s*number)\s*[:\-]\s*([A-Z0-9\-/]+)",),
    },
    "invoice": {
        "invoice_number": (r"(?:invoice\s*number|invoice\s*no\.?)\s*[:\-]\s*([A-Z0-9\-/]+)",),
        "supplier_name": (r"(?:supplier|vendor)\s*[:\-]\s*(.+)",),
        "invoice_date": (r"(?:invoice\s*date|date)\s*[:\-]\s*([0-9./-]+)",),
        "total_amount": (r"(?:total|amount\s*due|grand\s*total)\s*[:\-]?\s*([$EURBGN£€]?\s?[0-9.,]+)",),
    },
    "certificate": {
        "certificate_type": (r"(?:certificate|award)\s*[:\-]\s*(.+)",),
        "awarded_date": (r"(?:awarded\s*on|date)\s*[:\-]\s*([0-9./-]+)",),
        "degree": (r"(?:has\s+(?:successfully\s+)?completed|completed\s+the)\s+(.+)",),
        "degree_level": (r"\b(certificate|course|training|bootcamp)\b",),
    },
    "transcript": {
        "student_id": (r"(?:student\s*id|faculty\s*number)\s*[:\-]\s*([A-Z0-9\-/]+)",),
        "program": (r"(?:program|course)\s*[:\-]\s*(.+)",),
        "gpa": (r"\b(?:gpa|grade average)\s*[:\-]\s*([0-9.]+)",),
    },
    "letter of authorization": {
        "authorized_person_name": (
            r"authorize\s+(?:mr\.?|mrs\.?|ms\.?|dr\.?)?\s*([A-Z][A-Za-z.' -]+?)\s+to act on behalf of",
            r"authorize\s+(?:mr\.?|mrs\.?|ms\.?|dr\.?)?\s*([A-Z][A-Za-z.' -]+?)\s+to\b",
        ),
        "authorizing_person_name": (
            r"Issued by:\s*([A-Z][A-Za-z.' -]+)",
        ),
        "organization_name": (
            r"on behalf of\s+(.+?)(?:\.|\n)",
            r"Issued by:\s*[A-Z][A-Za-z.' -]+\s+[A-Za-z ]+\s+(.+)",
        ),
        "valid_from": (
            r"valid from\s*([0-9./-]+)",
        ),
        "valid_until": (
            r"(?:until|through)\s*([0-9./-]+)",
        ),
    },
    "power of attorney": {
        "authorized_person_name": (
            r"appoint\s+(?:mr\.?|mrs\.?|ms\.?|dr\.?)?\s*([A-Z][A-Za-z.' -]+?)\s+as my attorney",
            r"appoint\s+([A-Z][A-Za-z.' -]+?)\s+to act as attorney",
        ),
        "authorizing_person_name": (
            r"I,\s*([A-Z][A-Za-z.' -]+?),\s*(?:hereby|do hereby)",
            r"principal\s*[:\-]\s*([A-Z][A-Za-z.' -]+)",
        ),
        "organization_name": (
            r"on behalf of\s+(.+?)(?:\.|\n)",
        ),
        "valid_from": (
            r"effective from\s*([0-9./-]+)",
            r"valid from\s*([0-9./-]+)",
        ),
        "valid_until": (
            r"(?:until|through)\s*([0-9./-]+)",
        ),
    },
    "board resolution": {
        "authorized_person_name": (
            r"RESOLVED,?\s+that\s+([A-Z][A-Za-z.' -]+?)\s+is hereby authorized",
            r"authorized individual\s+is\s+([A-Z][A-Za-z.' -]+)",
        ),
        "organization_name": (
            r"BOARD RESOLUTION\s+(.+?)\s+Date:",
        ),
        "resolution_effective_until": (
            r"remains in effect until\s+(.+?)(?:\.|\n)",
        ),
    },
}

DOCUMENT_KEYWORDS = {
    "diploma": ("diploma", "bachelor", "master", "graduation", "faculty"),
    "invoice": ("invoice", "vat", "amount due", "bill to", "supplier"),
    "certificate": ("certificate", "certifies", "awarded", "course", "academy"),
    "transcript": ("transcript", "semester", "credits", "course"),
    "identity_card": ("identity card", "national id", "date of birth", "expiry date"),
    "letter of authorization": ("letter of authorization", "authorize", "act on behalf of", "to whom it may concern"),
    "power of attorney": ("power of attorney", "attorney-in-fact", "principal", "agent"),
    "board resolution": ("board resolution", "board members", "resolved,", "board of directors", "signatures"),
}

DATE_FORMATS = ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d")
INSTRUCTION_PATTERNS: tuple[tuple[str, str], ...] = (
    ("ignore_instructions", r"ignore (?:all|any|the|previous|prior) instructions"),
    ("secret_exfiltration", r"(?:leak|dump|reveal|show|print).{0,40}(?:database|db|api key|secret|password|env|environment)"),
    ("code_generation", r"(?:create|write|build).{0,30}(?:python app|script|program|server|bot)"),
    ("unrelated_recipe", r"(?:recipe|meatballs|cook|cooking instructions)"),
)


def ensure_supported_type(
    content_type: str | None,
    filename: str | None = None,
    file_bytes: bytes | None = None,
) -> str:
    mime_type = (content_type or "").lower()
    lowered_name = (filename or "").lower()

    if mime_type in SUPPORTED_MIME_TYPES:
        return mime_type

    if lowered_name.endswith(".docx") or (
        mime_type in {"application/msword", "application/octet-stream"}
        and file_bytes
        and file_bytes.startswith(b"PK")
    ):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    if lowered_name.endswith(".pdf"):
        return "application/pdf"

    if any(lowered_name.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp")):
        for known_type in SUPPORTED_MIME_TYPES:
            if known_type.startswith("image/") and lowered_name.endswith(known_type.split("/")[-1].replace("jpeg", "jpg")):
                return known_type

    if mime_type not in SUPPORTED_MIME_TYPES:
        raise ProcessingFailure(
            code="UNSUPPORTED_FILE_TYPE",
            message=f"Unsupported file type: {content_type or 'unknown'}",
            retryable=False,
        )
    return mime_type


def extract_ocr_artifacts(file_bytes: bytes, mime_type: str) -> OcrArtifacts:
    if mime_type == "application/pdf":
        return _extract_from_pdf(file_bytes)
    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return _extract_from_docx(file_bytes)
    return _extract_from_image(file_bytes)


def classify_and_extract(raw_text: str, document_type_hint: str | None = None) -> ExtractionResult:
    normalized_hint = (document_type_hint or "").strip().lower()
    classified_document_type = _classify_document_type(raw_text)
    classified_confidence = _classification_confidence(raw_text, classified_document_type)
    if normalized_hint and normalized_hint != classified_document_type and classified_confidence >= 0.75:
        document_type = classified_document_type
        classification_reason = f"content signals overrode hint '{normalized_hint}'"
    else:
        document_type = normalized_hint or classified_document_type
        classification_reason = "document type hint used" if normalized_hint else "content classification used"

    classification_confidence = classified_confidence if document_type == classified_document_type else 0.7

    common_fields = {
        field: ExtractedField(value=value, confidence=confidence)
        for field, value, confidence in _extract_fields(raw_text, COMMON_FIELD_PATTERNS)
        if field != "full_name_fallback"
    }
    if "full_name" not in common_fields:
        fallback_name = next(
            (
                (value, confidence)
                for field, value, confidence in _extract_fields(
                    raw_text, {"full_name_fallback": COMMON_FIELD_PATTERNS["full_name_fallback"]}
                )
            ),
            None,
        )
        if fallback_name:
            common_fields["full_name"] = ExtractedField(value=fallback_name[0], confidence=fallback_name[1])

    patterns = DOCUMENT_SPECIFIC_PATTERNS.get(document_type, {})
    specific_fields = {
        field: ExtractedField(value=value, confidence=confidence)
        for field, value, confidence in _extract_fields(raw_text, patterns)
    }
    if "degree_level" in specific_fields:
        specific_fields["degree_level"] = ExtractedField(
            value=str(specific_fields["degree_level"].value).lower(),
            confidence=specific_fields["degree_level"].confidence,
        )
    _enrich_academic_fields(document_type, raw_text, specific_fields)
    _enrich_authorization_fields(document_type, raw_text, common_fields, specific_fields)
    _enrich_board_resolution_fields(document_type, raw_text, common_fields, specific_fields)

    extraction_confidence = _average(
        [field.confidence for field in common_fields.values()]
        + [field.confidence for field in specific_fields.values()]
    )

    return ExtractionResult(
        document_type=document_type,
        subtype=_infer_subtype(document_type, raw_text),
        classification_confidence=classification_confidence,
        extraction_confidence=extraction_confidence,
        document_type_hint=normalized_hint or None,
        classification_reason=classification_reason,
        common_fields=common_fields,
        document_specific_fields=specific_fields,
    )


def build_validation_results(
    extraction: ExtractionResult,
    artifacts: OcrArtifacts,
    llm_review: LlmReviewResult | None = None,
) -> list[ValidationRuleResult]:
    results: list[ValidationRuleResult] = []

    has_text = bool(artifacts.raw_text.strip())
    results.append(
        ValidationRuleResult(
            rule="text_extracted",
            status=RuleStatus.passed if has_text else RuleStatus.failed,
            details=None if has_text else "No readable text was extracted from the document.",
        )
    )

    has_fields = bool(extraction.common_fields or extraction.document_specific_fields)
    results.append(
        ValidationRuleResult(
            rule="required_fields_present",
            status=RuleStatus.passed if has_fields else RuleStatus.warning,
            details=None if has_fields else "No canonical fields were confidently extracted.",
        )
    )

    issue_date = _field_value(extraction.common_fields, "issue_date")
    graduation_date = _field_value(extraction.document_specific_fields, "graduation_date")
    if issue_date and graduation_date:
        issue_dt = _parse_date(issue_date)
        graduation_dt = _parse_date(graduation_date)
        is_ordered = bool(issue_dt and graduation_dt and issue_dt >= graduation_dt)
        results.append(
            ValidationRuleResult(
                rule="date_consistency",
                status=RuleStatus.passed if is_ordered else RuleStatus.warning,
                details=None if is_ordered else "Issue date and graduation date could not be confirmed as logically ordered.",
            )
        )
    else:
        results.append(
            ValidationRuleResult(
                rule="date_consistency",
                status=RuleStatus.skipped,
                details="Relevant dates were not available.",
            )
        )

    valid_from = _field_value(extraction.document_specific_fields, "valid_from")
    valid_until = _field_value(extraction.document_specific_fields, "valid_until")
    if valid_from and valid_until:
        valid_from_dt = _parse_date(valid_from)
        valid_until_dt = _parse_date(valid_until)
        is_ordered = bool(valid_from_dt and valid_until_dt and valid_until_dt >= valid_from_dt)
        results.append(
            ValidationRuleResult(
                rule="authorization_validity_window",
                status=RuleStatus.passed if is_ordered else RuleStatus.warning,
                details=None if is_ordered else "Authorization validity dates are missing or out of order.",
            )
        )

    doc_number = _field_value(extraction.common_fields, "document_number")
    if doc_number:
        matches = bool(re.fullmatch(r"[A-Z0-9][A-Z0-9\-/]{2,}", str(doc_number).strip(), flags=re.IGNORECASE))
        results.append(
            ValidationRuleResult(
                rule="document_number_format",
                status=RuleStatus.passed if matches else RuleStatus.warning,
                details=None if matches else "Document number did not match the default heuristic pattern.",
            )
        )
    else:
        results.append(
            ValidationRuleResult(
                rule="document_number_format",
                status=RuleStatus.skipped,
                details="No document number was extracted.",
            )
        )

    suspicious = artifacts.ocr_confidence < 0.45 or not has_fields
    results.append(
        ValidationRuleResult(
            rule="suspicious_heuristics",
            status=RuleStatus.warning if suspicious else RuleStatus.passed,
            details="Low OCR confidence or sparse extraction results." if suspicious else None,
        )
    )

    if re.search(r"\b\d{2}XX\b|\b20XX\b|\b19XX\b", artifacts.raw_text, flags=re.IGNORECASE):
        results.append(
            ValidationRuleResult(
                rule="placeholder_date_tokens",
                status=RuleStatus.warning,
                details="The document contains placeholder date tokens like '20XX', which is suspicious for a finalized credential.",
            )
        )

    if extraction.document_type_hint and extraction.document_type_hint != extraction.document_type:
        results.append(
            ValidationRuleResult(
                rule="document_type_hint_mismatch",
                status=RuleStatus.warning,
                details=f"Hint suggested '{extraction.document_type_hint}' but content looks like '{extraction.document_type}'.",
            )
        )

    if extraction.document_type == "diploma" and re.search(r"certificate|course|academy|mode of learning|duration", artifacts.raw_text, flags=re.IGNORECASE):
        results.append(
            ValidationRuleResult(
                rule="credential_semantics_mismatch",
                status=RuleStatus.warning,
                details="The text contains certificate/course wording rather than classic diploma wording.",
            )
        )

    signer_names = _field_value(extraction.document_specific_fields, "signer_names")
    if signer_names:
        results.append(
            ValidationRuleResult(
                rule="signers_detected",
                status=RuleStatus.passed,
                details=f"Detected {len(signer_names)} signer(s)." if isinstance(signer_names, list) else "Detected signer information.",
            )
        )

    beneficiary_names = (
        _field_value(extraction.document_specific_fields, "authorized_person_names")
        or _field_value(extraction.document_specific_fields, "beneficiary_names")
    )
    if beneficiary_names:
        results.append(
            ValidationRuleResult(
                rule="beneficiaries_detected",
                status=RuleStatus.passed,
                details=f"Detected {len(beneficiary_names)} beneficiary/authorized person(s)." if isinstance(beneficiary_names, list) else "Detected beneficiary information.",
            )
        )

    if llm_review:
        if llm_review.requires_manual_review or llm_review.is_suspicious:
            results.append(
                ValidationRuleResult(
                    rule="llm_review",
                    status=RuleStatus.warning,
                    details="; ".join(llm_review.suspicion_reasons) or "LLM review marked this document for manual review.",
                )
            )
        else:
            results.append(
                ValidationRuleResult(
                    rule="llm_review",
                    status=RuleStatus.passed,
                    details=None,
                )
            )

    instruction_hits = _detect_instruction_attempts(artifacts.raw_text)
    if instruction_hits:
        results.append(
            ValidationRuleResult(
                rule="embedded_instruction_attempt",
                status=RuleStatus.warning,
                details=(
                    "Document text contains instruction-like or exfiltration-like content. "
                    f"Matched signals: {', '.join(instruction_hits)}. "
                    "The service treats document text as untrusted data and will not follow these instructions."
                ),
            )
        )

    return results


def build_response(
    document_id: str,
    filename: str,
    mime_type: str,
    processor_version: str,
    artifacts: OcrArtifacts,
    extraction: ExtractionResult,
    validation_results: list[ValidationRuleResult],
    llm_review: LlmReviewResult | None = None,
) -> UnifiedDocumentResponse:
    critical_warning_rules = {
        "placeholder_date_tokens",
        "document_type_hint_mismatch",
        "credential_semantics_mismatch",
        "embedded_instruction_attempt",
        "llm_review",
    }
    has_critical_warning = any(
        result.status == RuleStatus.warning and result.rule in critical_warning_rules
        for result in validation_results
    )
    is_valid = all(result.status != RuleStatus.failed for result in validation_results) and not has_critical_warning
    is_suspicious = any(
        result.status == RuleStatus.warning
        for result in validation_results
    ) or bool(llm_review and llm_review.is_suspicious)
    overall_confidence = _average(
        [value for value in [
            artifacts.ocr_confidence,
            extraction.classification_confidence,
            extraction.extraction_confidence,
            _validation_confidence(validation_results),
            llm_review.confidence if llm_review else None,
        ] if value is not None]
    )

    return UnifiedDocumentResponse(
        document_id=document_id,
        status="processed",
        document_type=extraction.document_type,
        subtype=extraction.subtype,
        summary=Summary(
            is_valid=is_valid,
            is_suspicious=is_suspicious,
            overall_confidence=overall_confidence,
        ),
        common_fields={
            key: ValueWithConfidence(value=value.value, confidence=value.confidence)
            for key, value in extraction.common_fields.items()
        },
        document_specific_fields={
            key: ValueWithConfidence(value=value.value, confidence=value.confidence)
            for key, value in extraction.document_specific_fields.items()
        },
        validation_results=validation_results,
        artifacts={
            "raw_text": artifacts.raw_text,
            "pages": artifacts.pages,
            "raw_ocr": artifacts.raw_ocr,
            "analysis": {
                "classification_reason": extraction.classification_reason,
                "llm_review": llm_review.model_dump() if llm_review else None,
            },
        },
        metadata=MetadataPayload(
            pages=artifacts.pages,
            mime_type=mime_type,
            filename=filename,
            processor_version=processor_version,
            received_at=datetime.now(timezone.utc),
            classification_confidence=extraction.classification_confidence,
            extraction_confidence=extraction.extraction_confidence,
            ocr_confidence=artifacts.ocr_confidence,
        ),
        error=None,
    )


def build_failed_response(
    document_id: str,
    filename: str,
    mime_type: str,
    processor_version: str,
    error: ErrorPayload,
    document_type_hint: str | None = None,
) -> UnifiedDocumentResponse:
    return UnifiedDocumentResponse(
        document_id=document_id,
        status="failed",
        document_type=document_type_hint or "unknown",
        subtype=None,
        summary=Summary(is_valid=False, is_suspicious=True, overall_confidence=0.0),
        common_fields={},
        document_specific_fields={},
        validation_results=[],
        artifacts={},
        metadata=MetadataPayload(
            pages=0,
            mime_type=mime_type,
            filename=filename,
            processor_version=processor_version,
            received_at=datetime.now(timezone.utc),
            classification_confidence=0.0,
            extraction_confidence=0.0,
            ocr_confidence=0.0,
        ),
        error=error,
    )


def _extract_from_pdf(file_bytes: bytes) -> OcrArtifacts:
    try:
        document = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:  # pragma: no cover
        raise ProcessingFailure("CORRUPTED_PDF", "The uploaded PDF could not be opened.") from exc

    texts: list[str] = []
    page_summaries: list[dict[str, Any]] = []
    for page_index, page in enumerate(document, start=1):
        text = page.get_text("text").strip()
        texts.append(text)
        page_summaries.append(
            {
                "page": page_index,
                "text_length": len(text),
                "has_embedded_text": bool(text),
            }
        )

    joined_text = "\n\n".join(chunk for chunk in texts if chunk).strip()
    if joined_text:
        return OcrArtifacts(
            raw_text=joined_text,
            pages=len(page_summaries),
            raw_ocr={"engine": "pymupdf-text", "pages": page_summaries},
            ocr_confidence=0.94,
        )

    rendered_pages: list[str] = []
    fallback_summaries: list[dict[str, Any]] = []
    confidences: list[float] = []
    for page_index, page in enumerate(document, start=1):
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        image = Image.open(io.BytesIO(pixmap.tobytes("png")))
        text, confidence = _ocr_image(image)
        rendered_pages.append(text)
        confidences.append(confidence)
        fallback_summaries.append(
            {
                "page": page_index,
                "text_length": len(text),
                "ocr_confidence": confidence,
            }
        )

    joined_text = "\n\n".join(chunk for chunk in rendered_pages if chunk).strip()
    if not joined_text:
        raise ProcessingFailure(
            "OCR_FAILED",
            "Unable to extract readable text from the uploaded document.",
            retryable=True,
        )

    return OcrArtifacts(
        raw_text=joined_text,
        pages=len(fallback_summaries),
        raw_ocr={"engine": "pytesseract", "pages": fallback_summaries},
        ocr_confidence=_average(confidences),
    )


def _extract_from_image(file_bytes: bytes) -> OcrArtifacts:
    try:
        image = _normalize_image(Image.open(io.BytesIO(file_bytes)))
    except Exception as exc:  # pragma: no cover
        raise ProcessingFailure(
            "UNSUPPORTED_FILE_TYPE",
            "The uploaded image could not be decoded.",
            retryable=False,
        ) from exc

    text, confidence = _ocr_image(image)
    if not text.strip():
        raise ProcessingFailure(
            "OCR_FAILED",
            "Unable to extract readable text from the uploaded image.",
            retryable=True,
        )

    return OcrArtifacts(
        raw_text=text,
        pages=1,
        raw_ocr={"engine": "pytesseract", "pages": [{"page": 1, "ocr_confidence": confidence}]},
        ocr_confidence=confidence,
    )


def _extract_from_docx(file_bytes: bytes) -> OcrArtifacts:
    try:
        document = DocxDocument(io.BytesIO(file_bytes))
    except Exception as exc:  # pragma: no cover
        raise ProcessingFailure(
            "UNSUPPORTED_FILE_TYPE",
            "The uploaded Word document could not be decoded.",
            retryable=False,
        ) from exc

    paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
    joined_text = "\n".join(paragraphs).strip()
    if not joined_text:
        raise ProcessingFailure(
            "OCR_FAILED",
            "The uploaded Word document did not contain readable text.",
            retryable=False,
        )

    return OcrArtifacts(
        raw_text=joined_text,
        pages=1,
        raw_ocr={"engine": "python-docx", "paragraphs": len(paragraphs)},
        ocr_confidence=0.98,
    )


def _ocr_image(image: Image.Image) -> tuple[str, float]:
    prepared = ImageOps.grayscale(ImageOps.autocontrast(image))
    try:
        text = pytesseract.image_to_string(prepared).strip()
        data = pytesseract.image_to_data(prepared, output_type=pytesseract.Output.DICT)
    except pytesseract.TesseractNotFoundError as exc:
        raise ProcessingFailure(
            "OCR_FAILED",
            "Tesseract is not installed or is not available on PATH.",
            retryable=False,
        ) from exc
    except pytesseract.TesseractError as exc:
        raise ProcessingFailure(
            "OCR_FAILED",
            "The OCR engine could not process the uploaded image.",
            retryable=True,
        ) from exc

    confidences: list[float] = []
    for value in data.get("conf", []):
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            continue
        if numeric >= 0:
            confidences.append(numeric / 100.0)

    return text, _average(confidences)


def _normalize_image(image: Image.Image) -> Image.Image:
    image.load()
    image = ImageOps.exif_transpose(image)

    if getattr(image, "is_animated", False):
        first_frame = next(ImageSequence.Iterator(image))
        image = first_frame.copy()

    if image.mode in {"RGBA", "LA"}:
        background = Image.new("RGB", image.size, "white")
        alpha = image.getchannel("A")
        background.paste(image.convert("RGB"), mask=alpha)
        return background

    if image.mode == "P":
        return image.convert("RGB")

    if image.mode != "RGB":
        return image.convert("RGB")

    return image


def _classify_document_type(raw_text: str) -> str:
    lowered = raw_text.lower()
    scores: dict[str, int] = {}
    for document_type, keywords in DOCUMENT_KEYWORDS.items():
        scores[document_type] = sum(1 for keyword in keywords if keyword in lowered)

    best_type = max(scores, key=scores.get, default="generic_document")
    return best_type if scores.get(best_type, 0) > 0 else "generic_document"


def _classification_confidence(raw_text: str, document_type: str) -> float:
    if document_type == "generic_document":
        return 0.45
    lowered = raw_text.lower()
    keyword_hits = sum(1 for keyword in DOCUMENT_KEYWORDS.get(document_type, ()) if keyword in lowered)
    return min(0.6 + keyword_hits * 0.1, 0.95)


def _infer_subtype(document_type: str, raw_text: str) -> str | None:
    lowered = raw_text.lower()
    if document_type == "diploma":
        if "bachelor" in lowered:
            return "bachelor_diploma"
        if "master" in lowered:
            return "master_diploma"
        if "doctor" in lowered or "phd" in lowered:
            return "doctorate_diploma"
        return "academic_diploma"
    if document_type == "invoice":
        return "commercial_invoice"
    if document_type == "transcript":
        return "academic_transcript"
    if document_type == "certificate":
        if "achievement" in lowered:
            return "achievement_certificate"
        return "general_certificate"
    if document_type == "letter of authorization":
        return "delegation_letter"
    if document_type == "power of attorney":
        return "attorney_in_fact"
    if document_type == "board resolution":
        return "corporate_resolution"
    return None


def _extract_fields(
    raw_text: str, patterns: dict[str, tuple[str, ...]]
) -> list[tuple[str, Any, float]]:
    extracted: list[tuple[str, Any, float]] = []
    for field_name, field_patterns in patterns.items():
        for pattern in field_patterns:
            match = re.search(pattern, raw_text, flags=re.IGNORECASE | re.MULTILINE)
            if not match:
                continue
            value = _clean_extracted_value(match.group(1))
            extracted.append((field_name, value, _field_confidence(raw_text, value)))
            break
    return extracted


def _field_confidence(raw_text: str, value: str) -> float:
    text_length = max(len(raw_text), 1)
    density_score = min(len(value) / text_length * 20, 0.15)
    return min(0.72 + density_score, 0.96)


def _enrich_academic_fields(
    document_type: str,
    raw_text: str,
    specific_fields: dict[str, ExtractedField],
) -> None:
    lowered = raw_text.lower()

    if "degree" not in specific_fields and "degree_title" in specific_fields:
        specific_fields["degree"] = specific_fields["degree_title"]

    if document_type in {"diploma", "certificate", "transcript"} and "degree_level" not in specific_fields:
        inferred_level = _infer_degree_level(lowered)
        if inferred_level:
            specific_fields["degree_level"] = ExtractedField(value=inferred_level, confidence=0.79)

    if document_type in {"diploma", "certificate"} and "degree" not in specific_fields:
        completion_match = re.search(
            r"(?:has\s+(?:successfully\s+)?completed|awarded\s+the)\s+(.+)",
            raw_text,
            flags=re.IGNORECASE,
        )
        if completion_match:
            value = _clean_extracted_value(completion_match.group(1))
            specific_fields["degree"] = ExtractedField(value=value, confidence=_field_confidence(raw_text, value))


def _infer_degree_level(lowered_text: str) -> str | None:
    if "bachelor" in lowered_text:
        return "bachelor"
    if "master" in lowered_text:
        return "master"
    if "phd" in lowered_text or "doctorate" in lowered_text or "doctoral" in lowered_text:
        return "doctorate"
    if "associate" in lowered_text:
        return "associate"
    if "certificate" in lowered_text:
        return "certificate"
    if "course" in lowered_text or "training" in lowered_text or "bootcamp" in lowered_text:
        return "course_certificate"
    if "diploma" in lowered_text:
        return "diploma"
    return None


def _enrich_authorization_fields(
    document_type: str,
    raw_text: str,
    common_fields: dict[str, ExtractedField],
    specific_fields: dict[str, ExtractedField],
) -> None:
    if document_type not in {"letter of authorization", "power of attorney"}:
        return

    if "organization_name" in specific_fields:
        common_fields["issuing_organization"] = specific_fields["organization_name"]

    if "authorizing_person_name" not in specific_fields:
        match = re.search(
            r"Issued by:\s*([A-Z][A-Za-z.' -]+)",
            raw_text,
            flags=re.IGNORECASE,
        )
        if match:
            value = _clean_extracted_value(match.group(1))
            specific_fields["authorizing_person_name"] = ExtractedField(
                value=value,
                confidence=_field_confidence(raw_text, value),
            )

    org_match = re.search(
        r"on behalf of\s+(.+?)(?:\.\s|This authorization|This power of attorney|Issued by:|$)",
        raw_text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if org_match:
        value = _clean_multiline_value(org_match.group(1))
        specific_fields["organization_name"] = ExtractedField(
            value=value,
            confidence=_field_confidence(raw_text, value),
        )
        common_fields["issuing_organization"] = specific_fields["organization_name"]

    if "authorized_person_name" not in specific_fields:
        auth_match = re.search(
            r"authorize\s+(?:mr\.?|mrs\.?|ms\.?|dr\.?)?\s*([A-Z][A-Za-z.' -]+?)\s+to\b",
            raw_text,
            flags=re.IGNORECASE,
        )
        if auth_match:
            value = _clean_extracted_value(auth_match.group(1))
            specific_fields["authorized_person_name"] = ExtractedField(
                value=value,
                confidence=_field_confidence(raw_text, value),
            )

    authorized_people = _extract_named_list(
        raw_text,
        (
            r"authorize\s+(.+?)\s+to act on behalf of",
            r"authorize\s+(.+?)\s+to\b",
        ),
    )
    if authorized_people:
        specific_fields["authorized_person_names"] = ExtractedField(
            value=authorized_people,
            confidence=0.88,
        )
        if "authorized_person_name" not in specific_fields and len(authorized_people) == 1:
            specific_fields["authorized_person_name"] = ExtractedField(
                value=authorized_people[0],
                confidence=0.88,
            )

    scope_match = re.search(
        r"(?:is permitted to|is authorized to)\s*:\s*(.+?)(?:This authorization is valid|This power of attorney is valid|Issued by:|Signature:|$)",
        raw_text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if scope_match and "authorization_scope" not in specific_fields:
        bullets = _extract_bullets(scope_match.group(1))
        if bullets:
            value = "; ".join(bullets[:5])
            specific_fields["authorization_scope"] = ExtractedField(
                value=value,
                confidence=min(_field_confidence(raw_text, value), 0.9),
            )


def _enrich_board_resolution_fields(
    document_type: str,
    raw_text: str,
    common_fields: dict[str, ExtractedField],
    specific_fields: dict[str, ExtractedField],
) -> None:
    if document_type != "board resolution":
        return

    org_match = re.search(
        r"BOARD RESOLUTION\s+(.+?)\s+Date:",
        raw_text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if org_match:
        value = _clean_multiline_value(org_match.group(1))
        specific_fields["organization_name"] = ExtractedField(
            value=value,
            confidence=0.9,
        )
        common_fields["issuing_organization"] = specific_fields["organization_name"]

    authorized_people = _extract_named_list(
        raw_text,
        (
            r"RESOLVED,?\s+that\s+(.+?)\s+is hereby authorized",
            r"authorized individual may be\s+(.+?)(?:\.|\n)",
        ),
    )
    if authorized_people:
        specific_fields["authorized_person_names"] = ExtractedField(
            value=authorized_people,
            confidence=0.89,
        )
        if len(authorized_people) == 1:
            specific_fields["authorized_person_name"] = ExtractedField(
                value=authorized_people[0],
                confidence=0.89,
            )

    board_members = _extract_named_block_list(raw_text, "Board Members:", "Signatures:")
    if board_members:
        specific_fields["board_member_names"] = ExtractedField(
            value=board_members,
            confidence=0.9,
        )

    signer_names = _extract_named_block_list(raw_text, "Signatures:", None)
    if signer_names:
        specific_fields["signer_names"] = ExtractedField(
            value=signer_names,
            confidence=0.92,
        )

    scope_match = re.search(
        r"(?:authorized individual may|authorized individual may:)\s*(.+?)(?:This resolution remains in effect|Board Members:|Signatures:|$)",
        raw_text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if scope_match:
        bullets = _extract_bullets(scope_match.group(1))
        if bullets:
            specific_fields["resolution_scope"] = ExtractedField(
                value="; ".join(bullets[:5]),
                confidence=0.88,
            )


def _clean_extracted_value(value: str) -> str:
    cleaned = value.strip().splitlines()[0].strip(" _")
    cleaned = re.sub(r"^the\s+", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip().strip(".,;:")


def _clean_multiline_value(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip().strip(" _")
    cleaned = re.sub(r"^the\s+", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip(".,;:")


def _extract_named_list(raw_text: str, patterns: tuple[str, ...]) -> list[str]:
    for pattern in patterns:
        match = re.search(pattern, raw_text, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            continue
        return _split_person_names(match.group(1))
    return []


def _extract_named_block_list(raw_text: str, start_label: str, end_label: str | None) -> list[str]:
    if end_label:
        pattern = rf"{re.escape(start_label)}\s*(.+?){re.escape(end_label)}"
    else:
        pattern = rf"{re.escape(start_label)}\s*(.+)$"
    match = re.search(pattern, raw_text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return []

    lines = [line.strip() for line in match.group(1).splitlines() if line.strip()]
    names: list[str] = []
    for line in lines:
        candidate = re.split(r"\s+[–-]\s+", line, maxsplit=1)[0].strip()
        candidate = _normalize_person_name(candidate)
        if candidate and candidate not in names and len(candidate.split()) >= 2:
            names.append(candidate)
    return names


def _split_person_names(text: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", text).strip().strip(".,;:")
    normalized = re.sub(r"\band\b", ",", normalized, flags=re.IGNORECASE)
    parts = [part.strip() for part in normalized.split(",") if part.strip()]
    names: list[str] = []
    for part in parts:
        candidate = _normalize_person_name(part)
        if candidate and candidate not in names and len(candidate.split()) >= 2:
            names.append(candidate)
    return names


def _normalize_person_name(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^(mr|mrs|ms|dr)\.?\s+", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip(".,;:() ")


def _extract_bullets(text: str) -> list[str]:
    items: list[str] = []
    for line in text.splitlines():
        cleaned = line.strip(" :-\u2022\t")
        if cleaned:
            items.append(cleaned)
    return items


def _field_value(fields: dict[str, ExtractedField], field_name: str) -> Any | None:
    field = fields.get(field_name)
    return field.value if field else None


def _parse_date(value: Any) -> date | None:
    if not value:
        return None
    text = str(value).strip()
    for date_format in DATE_FORMATS:
        try:
            return datetime.strptime(text, date_format).date()
        except ValueError:
            continue
    return None


def _validation_confidence(results: list[ValidationRuleResult]) -> float:
    weights = {
        RuleStatus.passed: 1.0,
        RuleStatus.warning: 0.55,
        RuleStatus.skipped: 0.5,
        RuleStatus.failed: 0.0,
    }
    return _average([weights[result.status] for result in results])


def _average(values: list[float]) -> float:
    clean_values = [value for value in values if value is not None]
    if not clean_values:
        return 0.0
    return round(sum(clean_values) / len(clean_values), 4)


def _detect_instruction_attempts(raw_text: str) -> list[str]:
    hits: list[str] = []
    for label, pattern in INSTRUCTION_PATTERNS:
        if re.search(pattern, raw_text, flags=re.IGNORECASE | re.DOTALL):
            hits.append(label)
    return hits
