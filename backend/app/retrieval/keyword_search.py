"""BM25 keyword index (rank-bm25 BM25Okapi), rebuilt in memory on every corpus change."""

from __future__ import annotations

import re
import threading
from collections.abc import Iterable

from rank_bm25 import BM25Okapi

_TOKEN = re.compile(r"[a-z0-9]+(?:[-_.][a-z0-9]+)*")

STOPWORDS: frozenset[str] = frozenset(
    """
    a an and are as at be but by can could did do does for from had has have how i if in into is it
    its me my of on or our so than that the their them then there these they this to was we were what
    when where which who whom why will with would you your
    """.split()
)


def tokenize(text: str) -> list[str]:
    """Lowercase, keep ids/codes like hr-204 or v2.1 as single tokens, drop stopwords."""
    return [t for t in _TOKEN.findall(text.lower()) if t not in STOPWORDS]


class KeywordIndex:
    def __init__(self) -> None:
        self._bm25: BM25Okapi | None = None
        self._ids: list[int] = []
        self._lock = threading.Lock()

    @property
    def size(self) -> int:
        return len(self._ids)

    def rebuild(self, chunks: Iterable[tuple[int, str]]) -> None:
        ids: list[int] = []
        corpus: list[list[str]] = []
        for chunk_id, content in chunks:
            ids.append(chunk_id)
            corpus.append(tokenize(content))
        bm25 = BM25Okapi(corpus) if corpus else None
        with self._lock:
            self._bm25 = bm25
            self._ids = ids

    def search(self, query: str, k: int) -> list[tuple[int, float]]:
        """Top-k (chunk_id, bm25_score) with score > 0, best first."""
        with self._lock:
            bm25, ids = self._bm25, self._ids
        if bm25 is None or not ids:
            return []
        terms = tokenize(query)
        if not terms:
            return []
        scores = bm25.get_scores(terms)
        ranked = sorted(
            ((ids[i], float(s)) for i, s in enumerate(scores) if s > 0),
            key=lambda pair: (-pair[1], pair[0]),
        )
        return ranked[:k]
