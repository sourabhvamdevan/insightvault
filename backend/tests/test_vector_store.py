from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from app.retrieval.embedder import Embedder
from app.retrieval.vector_store import VectorStore


def unit(v: np.ndarray) -> np.ndarray:
    return (v / np.linalg.norm(v, axis=-1, keepdims=True)).astype(np.float32)


@pytest.fixture
def vectors() -> np.ndarray:
    rng = np.random.default_rng(7)
    return unit(rng.normal(size=(5, 384)))


def test_add_and_search_order(tmp_path: Path, vectors: np.ndarray) -> None:
    store = VectorStore(tmp_path / "faiss.index")
    store.add(vectors, [10, 11, 12, 13, 14])
    assert store.ntotal == 5
    # Query close to vector 12, slightly toward 14.
    query = unit(vectors[2] + 0.3 * vectors[4])
    results = store.search(query, 5)
    assert [cid for cid, _ in results][:2] == [12, 14]
    scores = [s for _, s in results]
    assert scores == sorted(scores, reverse=True)
    assert results[0][1] == pytest.approx(float(query @ vectors[2]), abs=1e-5)


def test_search_drops_missing_ids(tmp_path: Path, vectors: np.ndarray) -> None:
    store = VectorStore(tmp_path / "faiss.index")
    store.add(vectors[:2], [1, 2])
    results = store.search(vectors[0], 20)
    assert len(results) == 2
    assert all(cid != -1 for cid, _ in results)
    assert VectorStore(tmp_path / "empty.index").search(vectors[0], 5) == []


def test_remove_by_id(tmp_path: Path, vectors: np.ndarray) -> None:
    store = VectorStore(tmp_path / "faiss.index")
    store.add(vectors, [10, 11, 12, 13, 14])
    assert store.remove([11, 13, 999]) == 2
    assert store.ids() == {10, 12, 14}
    assert 11 not in [cid for cid, _ in store.search(vectors[1], 5)]


def test_save_load_round_trip(tmp_path: Path, vectors: np.ndarray) -> None:
    path = tmp_path / "indexes" / "faiss.index"
    store = VectorStore(path)
    store.add(vectors, [10, 11, 12, 13, 14])
    store.remove([12])
    store.save()
    assert path.is_file()
    assert not path.with_name(path.name + ".tmp").exists()

    loaded = VectorStore(path)
    loaded.load()
    assert loaded.ntotal == 4
    assert loaded.ids() == {10, 11, 13, 14}
    assert loaded.search(vectors[3], 1)[0][0] == 13


def test_real_embeddings_rank_semantically(tmp_path: Path, embedder: Embedder) -> None:
    texts = [
        "Employees may work from home up to three days per week.",
        "Passwords must be at least fourteen characters long.",
        "The hotel cap is 160 euros per night.",
    ]
    vecs = embedder.encode(texts)
    assert vecs.shape == (3, 384)
    assert np.allclose(np.linalg.norm(vecs, axis=1), 1.0, atol=1e-5)
    store = VectorStore(tmp_path / "faiss.index")
    store.add(vecs, [1, 2, 3])
    top_id, score = store.search(embedder.encode_query("How many remote days are allowed?"), 3)[0]
    assert top_id == 1
    assert 0.25 < score <= 1.0
