"""Application settings. Single source of configuration (read from env and the root .env)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DEMO_DIR = PROJECT_ROOT / "demo"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    cors_origins: str = "http://localhost:5173"

    database_path: Path = Path("./data/knowledge.db")
    document_storage_path: Path = Path("./data/documents")
    faiss_index_path: Path = Path("./data/indexes/faiss.index")

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    chunk_size_tokens: int = 200
    chunk_overlap_tokens: int = 40
    top_k: int = 5
    candidate_pool: int = 20
    rrf_k: int = 60
    min_semantic_score: float = 0.25
    max_context_chars: int = 6000
    max_file_size_mb: int = 10

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_timeout_s: float = 120.0

    demo_mode: bool = False

    @model_validator(mode="after")
    def _resolve_paths(self) -> "Settings":
        # Relative paths are resolved against the project root (parent of backend/),
        # so the app behaves the same regardless of the launch directory.
        for name in ("database_path", "document_storage_path", "faiss_index_path"):
            value: Path = getattr(self, name)
            if not value.is_absolute():
                object.__setattr__(self, name, (PROJECT_ROOT / value).resolve())
        if self.chunk_overlap_tokens >= self.chunk_size_tokens:
            raise ValueError("CHUNK_OVERLAP_TOKENS must be smaller than CHUNK_SIZE_TOKENS")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def is_development(self) -> bool:
        return self.app_env.lower() == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
