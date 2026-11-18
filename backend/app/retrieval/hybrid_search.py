"""Hybrid retrieval: semantic + BM25 fused with Reciprocal Rank Fusion, dedupe, relevance gate."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from app.database import db
from app.retrieval.keyword_search import tokenize
from app.schemas import RetrievalMode
from app.services import Services

NEAR_DUPLICATE_OVERLAP = 0.8


@dataclass(frozen=True)
class FusedCandidate:
    chunk_id: int
    rrf_score: float
    semantic_score: float | None
    bm25_score: float | None


@dataclass(frozen=True)
class SearchResult:
    chunk_id: int
    document_id: str
    document_name: str
    page: int
    content: str
    semantic_score: float | None
    bm25_score: float | None
    rrf_score: float


def fuse(
    semantic: Sequence[tuple[int, float]],
    keyword: Sequence[tuple[int, float]],
    k: int,
) -> list[FusedCandidate]:
    """RRF(chunk) = sum over retrievers of 1 / (k + rank), rank 1-based.

    Sorted by RRF descending; ties broken by higher semantic score, then chunk id.
    """
    rrf: dict[int, float] = {}
    sem_scores: dict[int, float] = {}
    bm_scores: dict[int, float] = {}
    for rank, (cid, score) in enumerate(semantic, start=1):
        rrf[cid] = rrf.get(cid, 0.0) + 1.0 / (k + rank)
        sem_scores[cid] = score
    for rank, (cid, score) in enumerate(keyword, start=1):
        rrf[cid] = rrf.get(cid, 0.0) + 1.0 / (k + rank)
        bm_scores[cid] = score
    fused = [
        FusedCandidate(cid, score, sem_scores.get(cid), bm_scores.get(cid)) for cid, score in rrf.items()
    ]
    fused.sort(
        key=lambda c: (
            -c.rrf_score,
            -(c.semantic_score if c.semantic_score is not None else float("-inf")),
            c.chunk_id,
        )
    )
    return fused


def _is_near_duplicate(
    chunk: db.ChunkRow, tokens: set[str], selected: Sequence[tuple[db.ChunkRow, set[str]]]
) -> bool:
    text = chunk.content.strip()
    for other, other_tokens in selected:
        if text and text in other.content:
            return True
        if (
            chunk.document_id == other.document_id
            and chunk.page_number == other.page_number
            and tokens
            and len(tokens & other_tokens) / len(tokens) >= NEAR_DUPLICATE_OVERLAP
        ):
            return True
    return False


def select_results(
    candidates: Sequence[FusedCandidate], chunks: Mapping[int, db.ChunkRow], top_k: int
) -> list[SearchResult]:
    """Walk candidates in fused order, skip missing and near-duplicate chunks, keep top_k."""
    selected: list[tuple[db.ChunkRow, set[str]]] = []
    results: list[SearchResult] = []
    for cand in candidates:
        if len(results) >= top_k:
            break
        chunk = chunks.get(cand.chunk_id)
        if chunk is None:
            continue
        tokens = set(tokenize(chunk.content))
        if _is_near_duplicate(chunk, tokens, selected):
            continue
        selected.append((chunk, tokens))
        results.append(
            SearchResult(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                document_name=chunk.document_name,
                page=chunk.page_number,
                content=chunk.content,
                semantic_score=cand.semantic_score,
                bm25_score=cand.bm25_score,
                rrf_score=cand.rrf_score,
            )
        )
    return results


def passes_relevance_gate(results: Sequence[SearchResult], min_semantic_score: float) -> bool:
    """No-answer if empty, or best semantic score < threshold and no BM25 hit > 0."""
    if not results:
        return False
    semantic = [r.semantic_score for r in results if r.semantic_score is not None]
    if semantic and max(semantic) >= min_semantic_score:
        return True
    return any(r.bm25_score is not None and r.bm25_score > 0 for r in results)


def search(services: Services, query: str, mode: RetrievalMode = "hybrid") -> list[SearchResult]:
    settings = services.settings
    pool = settings.candidate_pool
    semantic: list[tuple[int, float]] = []
    keyword: list[tuple[int, float]] = []
    if mode in ("hybrid", "semantic"):
        query_vec = services.embedder.encode_query(query)
        with services.index_lock:
            semantic = services.vector_store.search(query_vec, pool)
    if mode in ("hybrid", "keyword"):
        keyword = services.keyword_index.search(query, pool)

    candidates = fuse(semantic, keyword, settings.rrf_k)
    chunks = db.get_chunks_by_ids(services.db_path, [c.chunk_id for c in candidates])
    return select_results(candidates, chunks, settings.top_k)
