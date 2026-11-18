"""Process-wide service container shared by the API routers (stored on app.state)."""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path

from fastapi import Request

from app.config import Settings
from app.database import db
from app.generation.llm_provider import LLMProvider
from app.retrieval.embedder import Embedder
from app.retrieval.keyword_search import KeywordIndex
from app.retrieval.vector_store import VectorStore

logger = logging.getLogger(__name__)

INTERRUPTED_MESSAGE = "Processing was interrupted. Delete this document and upload it again."


@dataclass
class Services:
    settings: Settings
    embedder: Embedder
    vector_store: VectorStore
    keyword_index: KeywordIndex
    llm: LLMProvider
    # Guards every mutation of the FAISS index and BM25 rebuilds.
    index_lock: threading.RLock = field(default_factory=threading.RLock)

    @property
    def db_path(self) -> Path:
        return self.settings.database_path

    def rebuild_keyword_index(self) -> None:
        """Rebuild BM25 over chunks that have a vector (i.e. are searchable)."""
        with self.index_lock:
            searchable = self.vector_store.ids()
            chunks = [(cid, text) for cid, text in db.list_all_chunks(self.db_path) if cid in searchable]
            self.keyword_index.rebuild(chunks)

    def reindex_all(self) -> None:
        """Rebuild the FAISS index from scratch by re-embedding every stored chunk."""
        with self.index_lock:
            chunks = db.list_all_chunks(self.db_path)
            self.vector_store.reset()
            if chunks:
                vectors = self.embedder.encode([text for _, text in chunks])
                self.vector_store.add(vectors, [cid for cid, _ in chunks])
            self.vector_store.save()

    def startup_sync(self) -> None:
        """Bring the DB, FAISS index and BM25 index into a consistent state at startup."""
        db.init_db(self.db_path)
        self.settings.document_storage_path.mkdir(parents=True, exist_ok=True)

        # Documents left 'processing' by a previous run can never finish: fail them cleanly.
        for doc_id in db.list_processing_document_ids(self.db_path):
            db.delete_chunks_for_document(self.db_path, doc_id)
            db.mark_document_failed(self.db_path, doc_id, error_message=INTERRUPTED_MESSAGE)
            logger.warning("Document %s was interrupted during processing; marked failed", doc_id)

        with self.index_lock:
            db_ids = {cid for cid, _ in db.list_all_chunks(self.db_path)}
            if self.vector_store.exists_on_disk():
                self.vector_store.load()
                if self.vector_store.ids() != db_ids:
                    logger.warning("FAISS index does not match the database; rebuilding from chunks")
                    self.reindex_all()
            elif db_ids:
                logger.warning("FAISS index missing; rebuilding from %d stored chunks", len(db_ids))
                self.reindex_all()
            else:
                self.vector_store.reset()
            self.rebuild_keyword_index()


def get_services(request: Request) -> Services:
    services: Services = request.app.state.services
    return services
