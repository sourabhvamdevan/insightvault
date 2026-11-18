"""Compare semantic, keyword and hybrid retrieval on eval/eval_set.json.

Builds a throwaway knowledge base from demo/sample_documents in a temporary directory
(your real data/ folder is not touched), runs every question in every mode, and prints
hit@1, hit@5 and MRR (over the top TOP_K results).

Usage (from backend/):  python -m eval.run_eval
"""

from __future__ import annotations

import json
import logging
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

from app.config import DEMO_DIR, Settings
from app.generation.llm_provider import NullProvider
from app.ingestion.pipeline import seed_directory
from app.retrieval.embedder import get_embedder
from app.retrieval.hybrid_search import search
from app.retrieval.keyword_search import KeywordIndex
from app.retrieval.vector_store import VectorStore
from app.schemas import RetrievalMode
from app.services import Services

EVAL_FILE = Path(__file__).resolve().parent / "eval_set.json"
MODES: tuple[RetrievalMode, ...] = ("semantic", "keyword", "hybrid")


@dataclass(frozen=True)
class EvalQuestion:
    id: str
    question: str
    document: str
    page: int
    type: str


@dataclass
class Score:
    n: int = 0
    hit1: int = 0
    hit5: int = 0
    rr: float = 0.0

    def add(self, rank: int | None) -> None:
        self.n += 1
        if rank is not None:
            self.hit1 += rank == 1
            self.hit5 += rank <= 5
            self.rr += 1.0 / rank

    def row(self, label: str) -> str:
        return f"| {label:<9} | {self.hit1 / self.n:.3f} | {self.hit5 / self.n:.3f} | {self.rr / self.n:.3f} |"


def load_questions() -> list[EvalQuestion]:
    data = json.loads(EVAL_FILE.read_text(encoding="utf-8"))
    return [EvalQuestion(**q) for q in data["questions"]]


def build_services(root: Path) -> Services:
    base = Settings()
    settings = base.model_copy(
        update={
            "database_path": root / "knowledge.db",
            "document_storage_path": root / "documents",
            "faiss_index_path": root / "indexes" / "faiss.index",
            "demo_mode": False,
        }
    )
    services = Services(
        settings=settings,
        embedder=get_embedder(settings.embedding_model),
        vector_store=VectorStore(settings.faiss_index_path),
        keyword_index=KeywordIndex(),
        llm=NullProvider(),
    )
    services.startup_sync()
    return services


def main() -> int:
    logging.basicConfig(level=logging.WARNING)
    questions = load_questions()
    with tempfile.TemporaryDirectory(prefix="kb-eval-") as tmp:
        services = build_services(Path(tmp))
        added = seed_directory(services, DEMO_DIR / "sample_documents")
        if added == 0:
            print("No sample documents found. Run: python scripts/make_sample_docs.py", file=sys.stderr)
            return 1
        print(
            f"Knowledge base: {added} documents, {services.vector_store.ntotal} chunks. "
            f"Questions: {len(questions)} (top_k={services.settings.top_k})\n"
        )

        overall = {m: Score() for m in MODES}
        by_type: dict[str, dict[RetrievalMode, Score]] = {}
        misses: list[str] = []
        for q in questions:
            for mode in MODES:
                results = search(services, q.question, mode)
                rank = next(
                    (i for i, r in enumerate(results, 1) if r.document_name == q.document and r.page == q.page),
                    None,
                )
                overall[mode].add(rank)
                by_type.setdefault(q.type, {m: Score() for m in MODES})[mode].add(rank)
                if mode == "hybrid" and rank != 1:
                    misses.append(f"  {q.id} rank={rank} {q.question!r} -> expected {q.document} p{q.page}")

    print("| Mode      | hit@1 | hit@5 | MRR   |")
    print("|-----------|-------|-------|-------|")
    for mode in MODES:
        print(overall[mode].row(mode.capitalize()))
    for qtype, scores in sorted(by_type.items()):
        print(f"\n{qtype} questions (n={scores['hybrid'].n})")
        for mode in MODES:
            print(scores[mode].row(mode.capitalize()))
    if misses:
        print("\nHybrid questions not ranked first:")
        print("\n".join(misses))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
