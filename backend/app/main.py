"""FastAPI app factory: settings, CORS, lifespan (load index, build BM25), router mounting."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, chat, documents, health
from app.api.errors import install_error_handlers
from app.config import DEMO_DIR, Settings, get_settings
from app.generation.llm_provider import LLMProvider, NullProvider, OllamaProvider
from app.ingestion.pipeline import seed_directory
from app.retrieval.embedder import get_embedder
from app.retrieval.keyword_search import KeywordIndex
from app.retrieval.vector_store import VectorStore
from app.services import Services

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("app")


def build_llm_provider(settings: Settings) -> LLMProvider:
    if settings.demo_mode:
        return NullProvider()
    return OllamaProvider(settings.ollama_base_url, settings.ollama_model, settings.ollama_timeout_s)


def create_app(settings: Settings | None = None, llm_provider: LLMProvider | None = None) -> FastAPI:
    cfg = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        services = Services(
            settings=cfg,
            embedder=get_embedder(cfg.embedding_model),
            vector_store=VectorStore(cfg.faiss_index_path),
            keyword_index=KeywordIndex(),
            llm=llm_provider or build_llm_provider(cfg),
        )
        services.startup_sync()
        if cfg.demo_mode:
            added = seed_directory(services, DEMO_DIR / "sample_documents")
            if added:
                logger.info("Demo mode: indexed %d sample documents", added)
        app.state.services = services
        logger.info(
            "Ready: %d vectors, %d BM25 chunks, demo_mode=%s",
            services.vector_store.ntotal,
            services.keyword_index.size,
            cfg.demo_mode,
        )
        yield

    app = FastAPI(
        title="InsightVault",
        version="1.0.0",
        description="Grounded question answering over PDFs with hybrid retrieval and citations.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
    )
    install_error_handlers(app)

    app.include_router(health.router, prefix="/api")
    app.include_router(documents.router, prefix="/api")
    app.include_router(chat.router, prefix="/api")
    app.include_router(analytics.router, prefix="/api")
    if cfg.is_development:
        app.include_router(chat.debug_router, prefix="/api")
    return app


app = create_app()
