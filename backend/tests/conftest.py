"""Shared fixtures. Tests use a temporary data directory and a fake LLM provider (no Ollama)."""

from __future__ import annotations

import os
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf
import pytest
from fastapi.testclient import TestClient

from app.config import DEMO_DIR, Settings
from app.generation.llm_provider import ChatTurn, LLMError, LLMStatus
from app.main import create_app
from app.retrieval.embedder import Embedder, get_embedder

SAMPLE_DIR = DEMO_DIR / "sample_documents"
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


@dataclass
class FakeProvider:
    """LLMProvider test double: returns a canned reply or raises a configured error."""

    reply: str = "Employees may work remotely up to three days per week [1]."
    error: LLMError | None = None
    calls: list[list[ChatTurn]] = field(default_factory=list)

    @property
    def model(self) -> str | None:
        return "fake-model"

    @property
    def generates_answers(self) -> bool:
        return True

    def status(self) -> LLMStatus:
        return LLMStatus(reachable=self.error is None, model="fake-model", model_available=self.error is None)

    def generate(self, messages: list[ChatTurn], *, temperature: float) -> str:
        self.calls.append(messages)
        if self.error is not None:
            raise self.error
        return self.reply


@pytest.fixture(scope="session")
def embedder() -> Embedder:
    return get_embedder(EMBEDDING_MODEL)


def make_settings(root: Path, **overrides: object) -> Settings:
    values: dict[str, object] = {
        "app_env": "development",
        "database_path": root / "knowledge.db",
        "document_storage_path": root / "documents",
        "faiss_index_path": root / "indexes" / "faiss.index",
        "embedding_model": EMBEDDING_MODEL,
        "demo_mode": False,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return make_settings(tmp_path)


@pytest.fixture
def fake_llm() -> FakeProvider:
    return FakeProvider()


@pytest.fixture
def client(settings: Settings, fake_llm: FakeProvider, embedder: Embedder) -> Iterator[TestClient]:
    with TestClient(create_app(settings, llm_provider=fake_llm)) as c:
        yield c


def make_pdf(path: Path, pages: list[str]) -> Path:
    """Write a simple text PDF with one string per page."""
    doc = pymupdf.open()
    for text in pages:
        page = doc.new_page()
        page.insert_textbox(pymupdf.Rect(50, 50, 545, 790), text, fontsize=10)
    doc.save(path)
    doc.close()
    return path


@pytest.fixture
def pdf_factory(tmp_path: Path) -> Callable[[str, list[str]], Path]:
    def factory(name: str, pages: list[str]) -> Path:
        return make_pdf(tmp_path / name, pages)

    return factory
