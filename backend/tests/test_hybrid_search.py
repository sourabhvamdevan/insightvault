from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.database.db import ChunkRow
from app.retrieval.hybrid_search import (
    FusedCandidate,
    SearchResult,
    fuse,
    passes_relevance_gate,
    select_results,
)
from app.retrieval.keyword_search import KeywordIndex, tokenize
from tests.conftest import SAMPLE_DIR


def chunk(cid: int, content: str, doc: str = "d1", page: int = 1) -> ChunkRow:
    return ChunkRow(cid, doc, f"{doc}.pdf", cid, page, content, len(content.split()))


def result(semantic: float | None, bm25: float | None) -> SearchResult:
    return SearchResult(1, "d", "d.pdf", 1, "text", semantic, bm25, 0.01)


# ---------------------------------------------------------------- RRF


def test_rrf_scores_match_hand_computation() -> None:
    semantic = [(1, 0.9), (2, 0.8), (3, 0.7)]
    keyword = [(3, 5.0), (4, 4.0), (1, 2.0)]
    fused = fuse(semantic, keyword, k=60)
    scores = {c.chunk_id: c.rrf_score for c in fused}
    assert scores[1] == pytest.approx(1 / 61 + 1 / 63)
    assert scores[3] == pytest.approx(1 / 63 + 1 / 61)
    assert scores[2] == pytest.approx(1 / 62)
    assert scores[4] == pytest.approx(1 / 62)
    # Ties are broken by the higher semantic score (None ranks below any score).
    assert [c.chunk_id for c in fused] == [1, 3, 2, 4]
    by_id = {c.chunk_id: c for c in fused}
    assert by_id[4].semantic_score is None and by_id[4].bm25_score == 4.0
    assert by_id[2].bm25_score is None and by_id[2].semantic_score == 0.8


def test_single_list_rrf() -> None:
    fused = fuse([], [(7, 3.0), (8, 1.0)], k=60)
    assert [(c.chunk_id, c.rrf_score) for c in fused] == [(7, pytest.approx(1 / 61)), (8, pytest.approx(1 / 62))]
    assert all(c.semantic_score is None for c in fused)


# ---------------------------------------------------------------- dedupe


def test_dedupe_substring_and_same_page_overlap() -> None:
    base = "employees may work remotely up to three days per week with one anchor day in the office"
    chunks = {
        1: chunk(1, base),
        2: chunk(2, "work remotely up to three days per week", doc="d2", page=9),  # substring of 1
        3: chunk(3, base + " agreed with the team lead"),  # same page, >=80% token overlap
        4: chunk(4, base + " agreed with the team lead", page=2),  # different page: kept
        5: chunk(5, "passwords must be at least fourteen characters long"),
    }
    candidates = [FusedCandidate(i, 1 / (60 + i), 0.5, None) for i in (1, 2, 3, 4, 5, 99)]
    results = select_results(candidates, chunks, top_k=5)
    assert [r.chunk_id for r in results] == [1, 4, 5]


def test_select_respects_top_k() -> None:
    chunks = {i: chunk(i, f"unique content number {i} " + "x" * i, page=i) for i in range(1, 10)}
    candidates = [FusedCandidate(i, 1.0 / i, None, 1.0) for i in range(1, 10)]
    assert len(select_results(candidates, chunks, top_k=5)) == 5


# ---------------------------------------------------------------- gate


def test_gate_rules() -> None:
    assert passes_relevance_gate([], 0.25) is False
    assert passes_relevance_gate([result(0.10, None), result(0.20, None)], 0.25) is False
    assert passes_relevance_gate([result(0.10, None), result(0.30, None)], 0.25) is True
    # BM25-only hit (e.g. an exact policy id) passes even with a low semantic score.
    assert passes_relevance_gate([result(0.05, None), result(None, 2.7)], 0.25) is True
    assert passes_relevance_gate([result(None, 1.2)], 0.25) is True


# ---------------------------------------------------------------- BM25 tokenizer / index


def test_tokenizer_keeps_codes() -> None:
    assert tokenize("Policy HR-204 v2.1 and the snake_case id") == ["policy", "hr-204", "v2.1", "snake_case", "id"]


def test_keyword_index_empty_and_search() -> None:
    index = KeywordIndex()
    assert index.search("anything", 5) == []
    index.rebuild([(1, "annual leave is 24 days"), (2, "passwords need 14 characters"), (3, "hotel cap is 160 euros")])
    top = index.search("How many days of annual leave?", 5)
    assert top[0][0] == 1 and top[0][1] > 0
    assert index.search("the and of", 5) == []


# ---------------------------------------------------------------- modes on real data


@pytest.fixture
def indexed_client(client: TestClient) -> TestClient:
    for pdf in sorted(SAMPLE_DIR.glob("*.pdf")):
        with pdf.open("rb") as fh:
            resp = client.post("/api/documents/upload", files={"file": (pdf.name, fh, "application/pdf")})
        assert resp.status_code == 202
    docs = client.get("/api/documents").json()
    assert all(d["status"] == "ready" for d in docs)
    return client


def debug_search(client: TestClient, query: str, mode: str) -> dict:
    resp = client.post("/api/debug/search", json={"query": query, "retrieval_mode": mode})
    assert resp.status_code == 200
    return resp.json()


def test_mode_switch_and_exact_code(indexed_client: TestClient) -> None:
    semantic = debug_search(indexed_client, "SEC-117", "semantic")["results"]
    assert semantic and all(r["bm25_score"] is None for r in semantic)

    for mode in ("keyword", "hybrid"):
        results = debug_search(indexed_client, "SEC-117", mode)["results"]
        assert (results[0]["document_name"], results[0]["page"]) == ("IT_Security_Policy.pdf", 3)
        assert results[0]["bm25_score"] > 0
    keyword = debug_search(indexed_client, "SEC-117", "keyword")["results"]
    assert all(r["semantic_score"] is None for r in keyword)

    hybrid = debug_search(indexed_client, "How many days can I work from another country?", "hybrid")
    assert hybrid["passes_gate"] is True
    assert len(hybrid["results"]) <= 5
    assert (hybrid["results"][0]["document_name"], hybrid["results"][0]["page"]) == ("Remote_Work_Policy.pdf", 2)

    unrelated = debug_search(indexed_client, "What is the recipe for banana bread?", "hybrid")
    assert unrelated["passes_gate"] is False
