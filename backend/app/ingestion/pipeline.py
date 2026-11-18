"""Ingestion orchestration: parse -> chunk -> store -> embed -> index, with status transitions.

Runs as a FastAPI BackgroundTask after the upload endpoint has returned 202.
"""

from __future__ import annotations

import hashlib
import logging
import shutil
import uuid
from pathlib import Path

from app.database import db
from app.ingestion.chunker import chunk_pages
from app.ingestion.parser import PdfParseError, parse_pdf
from app.services import Services

logger = logging.getLogger(__name__)

NO_TEXT_MESSAGE = "No extractable text. Scanned PDFs are not supported."
CORRUPT_MESSAGE = "Could not read this PDF. The file may be corrupted or encrypted."
GENERIC_MESSAGE = "Processing failed because of an unexpected error."


class IngestionError(Exception):
    """A failure with a message that is safe to show to the user."""

    def __init__(self, user_message: str) -> None:
        super().__init__(user_message)
        self.user_message = user_message


def _remove_document_from_indexes(services: Services, document_id: str) -> None:
    with services.index_lock:
        chunk_ids = db.get_chunk_ids_for_document(services.db_path, document_id)
        if chunk_ids:
            services.vector_store.remove(chunk_ids)
            services.vector_store.save()
        db.delete_chunks_for_document(services.db_path, document_id)
        services.rebuild_keyword_index()


def ingest_document(services: Services, document_id: str) -> None:
    settings = services.settings
    doc = db.get_document(services.db_path, document_id)
    if doc is None:
        return
    path = settings.document_storage_path / doc.stored_name
    page_count: int | None = None
    try:
        try:
            parsed = parse_pdf(path)
        except PdfParseError as exc:
            raise IngestionError(CORRUPT_MESSAGE) from exc
        page_count = parsed.page_count
        if not parsed.pages:
            raise IngestionError(NO_TEXT_MESSAGE)

        chunks = chunk_pages(
            parsed.pages,
            services.embedder.tokenizer,
            chunk_size=settings.chunk_size_tokens,
            overlap=settings.chunk_overlap_tokens,
        )
        if not chunks:
            raise IngestionError(NO_TEXT_MESSAGE)

        chunk_ids = db.insert_chunks(
            services.db_path,
            document_id,
            [
                db.NewChunk(
                    chunk_index=c.chunk_index,
                    page_number=c.page_number,
                    content=c.content,
                    token_count=c.token_count,
                )
                for c in chunks
            ],
        )
        vectors = services.embedder.encode([c.content for c in chunks])

        with services.index_lock:
            services.vector_store.add(vectors, chunk_ids)
            services.vector_store.save()
            services.rebuild_keyword_index()

        updated = db.mark_document_ready(
            services.db_path, document_id, chunk_count=len(chunk_ids), page_count=parsed.page_count
        )
        if not updated:
            # The document row disappeared while we were indexing: drop its vectors.
            with services.index_lock:
                services.vector_store.remove(chunk_ids)
                services.vector_store.save()
                services.rebuild_keyword_index()
        else:
            logger.info("Indexed document %s: %d chunks", document_id, len(chunk_ids))
    except Exception as exc:
        if isinstance(exc, IngestionError):
            message = exc.user_message
            logger.warning("Ingestion of %s failed: %s", document_id, message, exc_info=exc.__cause__)
        else:
            message = GENERIC_MESSAGE
            logger.exception("Ingestion of %s failed", document_id)
        try:
            _remove_document_from_indexes(services, document_id)
        finally:
            db.mark_document_failed(
                services.db_path, document_id, error_message=message, page_count=page_count
            )


def seed_directory(services: Services, folder: Path) -> int:
    """Ingest every PDF in `folder` that is not already in the knowledge base (by SHA-256).

    Used to load the sample knowledge base in demo mode and by the evaluation script.
    Runs synchronously. Returns the number of documents added.
    """
    if not folder.is_dir():
        logger.warning("Seed folder %s does not exist", folder)
        return 0
    storage = services.settings.document_storage_path
    storage.mkdir(parents=True, exist_ok=True)
    added = 0
    for pdf in sorted(folder.glob("*.pdf")):
        data = pdf.read_bytes()
        sha256 = hashlib.sha256(data).hexdigest()
        if db.get_document_by_sha256(services.db_path, sha256) is not None:
            continue
        document_id = uuid.uuid4().hex
        stored_name = f"{document_id}.pdf"
        shutil.copyfile(pdf, storage / stored_name)
        db.insert_document(
            services.db_path,
            document_id=document_id,
            filename=pdf.name,
            stored_name=stored_name,
            sha256=sha256,
            file_size=len(data),
        )
        ingest_document(services, document_id)
        added += 1
    return added
