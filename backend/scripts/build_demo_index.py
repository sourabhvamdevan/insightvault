"""Pre-index the sample knowledge base into the configured data directory.

Used at Docker build time so a demo deployment starts with a ready index.
Usage (from backend/):  python -m scripts.build_demo_index
"""

from __future__ import annotations

import logging

from app.config import DEMO_DIR, get_settings
from app.generation.llm_provider import NullProvider
from app.ingestion.pipeline import seed_directory
from app.retrieval.embedder import get_embedder
from app.retrieval.keyword_search import KeywordIndex
from app.retrieval.vector_store import VectorStore
from app.services import Services


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    services = Services(
        settings=settings,
        embedder=get_embedder(settings.embedding_model),
        vector_store=VectorStore(settings.faiss_index_path),
        keyword_index=KeywordIndex(),
        llm=NullProvider(),
    )
    services.startup_sync()
    added = seed_directory(services, DEMO_DIR / "sample_documents")
    print(f"Indexed {added} new documents; index now holds {services.vector_store.ntotal} vectors.")


if __name__ == "__main__":
    main()
