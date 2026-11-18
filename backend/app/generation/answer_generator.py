"""Retrieval -> gate -> prompt -> LLM -> citation parsing. Produces the answer and its sources."""

from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass

from app.generation.llm_provider import LLMError
from app.generation.prompt_builder import HistoryMessage, build_prompt
from app.retrieval.hybrid_search import SearchResult, passes_relevance_gate, search
from app.schemas import AnswerMode, RetrievalMode, SourceOut
from app.services import Services

NO_ANSWER_TEXT = "I could not find this in the uploaded documents."
RETRIEVAL_ONLY_TEXT = (
    "Live answer generation is unavailable. These are the most relevant passages from the documents."
)
TEMPERATURE = 0.1
_CITATION = re.compile(r"\[(\d+)\]")


@dataclass(frozen=True)
class GeneratedAnswer:
    answer: str
    answer_mode: AnswerMode
    model: str | None
    sources: list[SourceOut]


class AnswerGenerationError(Exception):
    """The LLM failed; carries the retrieved evidence so the API can still return it."""

    def __init__(self, cause: LLMError, sources: list[SourceOut]) -> None:
        super().__init__(str(cause))
        self.cause = cause
        self.sources = sources


def parse_citations(text: str, n_sources: int) -> set[int]:
    """Source numbers cited as [n] that fall within 1..n_sources."""
    return {int(m) for m in _CITATION.findall(text) if 1 <= int(m) <= n_sources}


def to_sources(results: Sequence[SearchResult], cited: set[int] | None = None) -> list[SourceOut]:
    cited = cited or set()
    return [
        SourceOut(
            ref=i,
            chunk_id=r.chunk_id,
            document_id=r.document_id,
            document_name=r.document_name,
            page=r.page,
            content=r.content,
            semantic_score=round(r.semantic_score, 4) if r.semantic_score is not None else None,
            bm25_score=round(r.bm25_score, 4) if r.bm25_score is not None else None,
            rrf_score=round(r.rrf_score, 6),
            cited=i in cited,
        )
        for i, r in enumerate(results, 1)
    ]


def _is_no_answer(text: str) -> bool:
    normalized = text.strip().strip('"').strip()
    return normalized.rstrip(".") == NO_ANSWER_TEXT.rstrip(".")


def answer_question(
    services: Services,
    question: str,
    mode: RetrievalMode,
    history: Sequence[HistoryMessage],
) -> GeneratedAnswer:
    settings = services.settings
    provider = services.llm
    results = search(services, question, mode)

    if not passes_relevance_gate(results, settings.min_semantic_score):
        return GeneratedAnswer(NO_ANSWER_TEXT, "no_answer", provider.model, [])

    if not provider.generates_answers:
        return GeneratedAnswer(RETRIEVAL_ONLY_TEXT, "retrieval_only", None, to_sources(results))

    prompt = build_prompt(question, results, history, max_context_chars=settings.max_context_chars)
    try:
        text = provider.generate(prompt.messages, temperature=TEMPERATURE)
    except LLMError as exc:
        raise AnswerGenerationError(exc, to_sources(prompt.sources)) from exc

    if not text.strip() or _is_no_answer(text):
        return GeneratedAnswer(NO_ANSWER_TEXT, "no_answer", provider.model, to_sources(prompt.sources))

    cited = parse_citations(text, len(prompt.sources))
    return GeneratedAnswer(text.strip(), "generated", provider.model, to_sources(prompt.sources, cited))
