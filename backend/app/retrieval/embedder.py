"""Singleton SentenceTransformer wrapper producing L2-normalised float32 vectors."""

from __future__ import annotations

import threading
from collections.abc import Sequence

import numpy as np
import numpy.typing as npt
from sentence_transformers import SentenceTransformer

from app.ingestion.chunker import Tokenizer

EMBEDDING_DIM = 384
BATCH_SIZE = 32


class Embedder:
    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model = SentenceTransformer(model_name, device="cpu")
        get_dim = getattr(self._model, "get_embedding_dimension", None) or getattr(
            self._model, "get_sentence_embedding_dimension"
        )
        dim = get_dim()
        if dim != EMBEDDING_DIM:
            raise ValueError(f"Embedding model {model_name} has dim {dim}, expected {EMBEDDING_DIM}")
        self._lock = threading.Lock()

    @property
    def tokenizer(self) -> Tokenizer:
        tok: Tokenizer = self._model.tokenizer
        return tok

    def encode(self, texts: Sequence[str]) -> npt.NDArray[np.float32]:
        if not texts:
            return np.zeros((0, EMBEDDING_DIM), dtype=np.float32)
        with self._lock:
            vectors = self._model.encode(
                list(texts),
                batch_size=BATCH_SIZE,
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
        return np.ascontiguousarray(vectors, dtype=np.float32)

    def encode_query(self, text: str) -> npt.NDArray[np.float32]:
        return self.encode([text])[0]


_instances: dict[str, Embedder] = {}
_instances_lock = threading.Lock()


def get_embedder(model_name: str) -> Embedder:
    """Process-wide singleton per model name (loading the model is expensive)."""
    with _instances_lock:
        if model_name not in _instances:
            _instances[model_name] = Embedder(model_name)
        return _instances[model_name]
