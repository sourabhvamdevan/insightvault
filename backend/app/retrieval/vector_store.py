"""FAISS vector store: IndexIDMap2(IndexFlatIP(384)) keyed by SQLite chunk ids."""

from __future__ import annotations

import os
from collections.abc import Sequence
from pathlib import Path

import faiss
import numpy as np
import numpy.typing as npt

from app.retrieval.embedder import EMBEDDING_DIM


def _new_index(dim: int) -> faiss.Index:
    return faiss.IndexIDMap2(faiss.IndexFlatIP(dim))


class VectorStore:
    def __init__(self, path: Path, dim: int = EMBEDDING_DIM) -> None:
        self.path = path
        self.dim = dim
        self.index: faiss.Index = _new_index(dim)

    @property
    def ntotal(self) -> int:
        return int(self.index.ntotal)

    def exists_on_disk(self) -> bool:
        return self.path.is_file()

    def load(self) -> None:
        index = faiss.read_index(str(self.path))
        if index.d != self.dim:
            raise ValueError(f"Index dimension {index.d} does not match {self.dim}")
        self.index = index

    def reset(self) -> None:
        self.index = _new_index(self.dim)

    def save(self) -> None:
        """Atomic save: write a temp file, then os.replace."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_name(self.path.name + ".tmp")
        faiss.write_index(self.index, str(tmp))
        os.replace(tmp, self.path)

    def add(self, vectors: npt.NDArray[np.float32], ids: Sequence[int]) -> None:
        if len(ids) == 0:
            return
        vecs = np.ascontiguousarray(vectors, dtype=np.float32)
        if vecs.ndim != 2 or vecs.shape[1] != self.dim or vecs.shape[0] != len(ids):
            raise ValueError(f"Expected vectors of shape ({len(ids)}, {self.dim}), got {vecs.shape}")
        self.index.add_with_ids(vecs, np.asarray(ids, dtype=np.int64))

    def remove(self, ids: Sequence[int]) -> int:
        if len(ids) == 0:
            return 0
        # The Python wrapper converts an int64 array to an IDSelectorBatch.
        return int(self.index.remove_ids(np.asarray(ids, dtype=np.int64)))  # type: ignore[arg-type]

    def ids(self) -> set[int]:
        if self.ntotal == 0:
            return set()
        id_map = self.index.id_map  # type: ignore[attr-defined]  # IndexIDMap2 keeps ids here
        return {int(i) for i in faiss.vector_to_array(id_map)}

    def search(self, query: npt.NDArray[np.float32], k: int) -> list[tuple[int, float]]:
        """Return (chunk_id, cosine_score) in rank order; -1 ids are dropped."""
        if self.ntotal == 0 or k <= 0:
            return []
        q = np.ascontiguousarray(query, dtype=np.float32).reshape(1, self.dim)
        scores, ids = self.index.search(q, min(k, self.ntotal))
        return [(int(i), float(s)) for s, i in zip(scores[0], ids[0]) if int(i) != -1]
