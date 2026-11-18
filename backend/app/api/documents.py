"""Document endpoints: upload (202 + background ingestion), list, get, delete."""

from __future__ import annotations

import hashlib
import logging
import os
import sqlite3
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from starlette.datastructures import UploadFile

from app.api.errors import ApiError
from app.database import db
from app.ingestion.pipeline import ingest_document
from app.schemas import DocumentOut
from app.services import Services, get_services

logger = logging.getLogger(__name__)

router = APIRouter(tags=["documents"])

PDF_MAGIC = b"%PDF-"
READ_CHUNK = 1024 * 1024
MULTIPART_OVERHEAD = 64 * 1024  # headroom for multipart boundaries and headers
MAX_FILENAME_CHARS = 255


def to_document_out(doc: db.DocumentRow) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        filename=doc.filename,
        file_size=doc.file_size,
        page_count=doc.page_count,
        status=doc.status,  # type: ignore[arg-type]  # constrained by the CHECK constraint
        error_message=doc.error_message,
        chunk_count=doc.chunk_count,
        uploaded_at=doc.uploaded_at,
    )


def ensure_writable(services: Services) -> None:
    if services.settings.demo_mode:
        raise ApiError(403, "demo_read_only", "This public demo is read-only. Uploads and deletes are disabled.")


def _display_name(raw: str) -> str:
    name = raw.replace("\\", "/").split("/")[-1].strip()
    return name[:MAX_FILENAME_CHARS] or "document.pdf"


def _too_large(services: Services) -> ApiError:
    return ApiError(
        413, "file_too_large", f"File exceeds the {services.settings.max_file_size_mb} MB limit."
    )


@router.post("/documents/upload", status_code=202, response_model=DocumentOut)
async def upload_document(
    request: Request,
    background: BackgroundTasks,
    services: Services = Depends(get_services),
) -> DocumentOut:
    ensure_writable(services)
    max_bytes = services.settings.max_file_size_bytes

    # Reject oversized bodies from the declared length before reading anything.
    declared = request.headers.get("content-length", "")
    if declared.isdigit() and int(declared) > max_bytes + MULTIPART_OVERHEAD:
        raise _too_large(services)

    form = await request.form(max_files=1, max_fields=5)
    upload = form.get("file")
    if not isinstance(upload, UploadFile):
        raise ApiError(400, "invalid_file_type", "Send a PDF in the multipart field 'file'.")

    filename = _display_name(upload.filename or "")
    if not filename.lower().endswith(".pdf"):
        raise ApiError(400, "invalid_file_type", "Only PDF files are supported.")

    storage = services.settings.document_storage_path
    storage.mkdir(parents=True, exist_ok=True)
    document_id = uuid.uuid4().hex
    stored_name = f"{document_id}.pdf"
    tmp_path = storage / f"{document_id}.part"
    final_path = storage / stored_name

    hasher = hashlib.sha256()
    size = 0
    try:
        with open(tmp_path, "wb") as out:
            first = True
            while True:
                chunk = await upload.read(READ_CHUNK)
                if not chunk:
                    break
                if first:
                    if not chunk.startswith(PDF_MAGIC):
                        raise ApiError(400, "invalid_file_type", "The file is not a valid PDF.")
                    first = False
                size += len(chunk)
                if size > max_bytes:
                    raise _too_large(services)
                hasher.update(chunk)
                out.write(chunk)
        if size == 0:
            raise ApiError(400, "invalid_file_type", "The file is empty.")

        sha256 = hasher.hexdigest()
        existing = db.get_document_by_sha256(services.db_path, sha256)
        if existing is not None:
            raise ApiError(
                409,
                "duplicate_document",
                f"This file was already uploaded as '{existing.filename}'.",
                extra_error={"document_id": existing.id},
            )

        os.replace(tmp_path, final_path)
        try:
            doc = db.insert_document(
                services.db_path,
                document_id=document_id,
                filename=filename,
                stored_name=stored_name,
                sha256=sha256,
                file_size=size,
            )
        except sqlite3.IntegrityError as exc:
            final_path.unlink(missing_ok=True)
            dup = db.get_document_by_sha256(services.db_path, sha256)
            raise ApiError(
                409,
                "duplicate_document",
                "This file was already uploaded.",
                extra_error={"document_id": dup.id if dup else None},
            ) from exc
    finally:
        await upload.close()
        tmp_path.unlink(missing_ok=True)

    background.add_task(ingest_document, services, document_id)
    return to_document_out(doc)


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(services: Services = Depends(get_services)) -> list[DocumentOut]:
    return [to_document_out(d) for d in db.list_documents(services.db_path)]


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, services: Services = Depends(get_services)) -> DocumentOut:
    doc = db.get_document(services.db_path, document_id)
    if doc is None:
        raise ApiError(404, "not_found", "Document not found.")
    return to_document_out(doc)


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(document_id: str, services: Services = Depends(get_services)) -> Response:
    ensure_writable(services)
    doc = db.get_document(services.db_path, document_id)
    if doc is None:
        raise ApiError(404, "not_found", "Document not found.")
    if doc.status == "processing":
        raise ApiError(409, "document_processing", "Wait for processing to finish before deleting.")

    with services.index_lock:
        chunk_ids = db.get_chunk_ids_for_document(services.db_path, document_id)
        services.vector_store.remove(chunk_ids)
        services.vector_store.save()
        db.delete_document(services.db_path, document_id)  # cascades to chunks
        # Past this point the row is gone for good; later failures are logged only.
        try:
            (services.settings.document_storage_path / doc.stored_name).unlink(missing_ok=True)
        except OSError:
            logger.exception("Could not delete stored file for document %s", document_id)
        try:
            services.rebuild_keyword_index()
        except Exception:
            logger.exception("BM25 rebuild failed after deleting %s", document_id)
    return Response(status_code=204)
