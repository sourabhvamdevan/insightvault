"""Chat and conversation endpoints, demo questions, and the development-only debug search."""

from __future__ import annotations

import json
import logging
import time
import uuid

from fastapi import APIRouter, Depends
from pydantic import TypeAdapter, ValidationError

from app.api.errors import ApiError
from app.config import DEMO_DIR
from app.database import db
from app.generation.answer_generator import AnswerGenerationError, answer_question
from app.generation.llm_provider import LLMTimeoutError, ModelNotFoundError
from app.generation.prompt_builder import HISTORY_MESSAGES, HistoryMessage
from app.retrieval.hybrid_search import passes_relevance_gate, search
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ConversationOut,
    DebugSearchRequest,
    DebugSearchResponse,
    DebugSearchResult,
    DemoQuestionsResponse,
    MessageOut,
    SourceOut,
)
from app.services import Services, get_services

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])
debug_router = APIRouter(tags=["debug"])

TITLE_CHARS = 60
_sources_adapter = TypeAdapter(list[SourceOut])


def _llm_error(services: Services, err: AnswerGenerationError, mode: str) -> ApiError:
    s = services.settings
    cause = err.cause
    if isinstance(cause, ModelNotFoundError):
        message = f"The model '{s.ollama_model}' is not installed in Ollama. Run: ollama pull {s.ollama_model}"
    elif isinstance(cause, LLMTimeoutError):
        message = f"The language model did not respond within {s.ollama_timeout_s:g} seconds. Try again."
    else:
        message = (
            f"Could not reach Ollama at {s.ollama_base_url}. Install it from https://ollama.com, "
            f"start it with 'ollama serve', then run 'ollama pull {s.ollama_model}'."
        )
    return ApiError(
        cause.status_code,
        cause.code,
        message,
        extra_body={
            "retrieval_mode": mode,
            "sources": [src.model_dump() for src in err.sources],
        },
    )


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, services: Services = Depends(get_services)) -> ChatResponse:
    started = time.perf_counter()
    path = services.db_path
    history: list[HistoryMessage] = []
    if body.conversation_id is not None:
        if db.get_conversation(path, body.conversation_id) is None:
            raise ApiError(404, "not_found", "Conversation not found.")
        history = [
            HistoryMessage(role=m.role, content=m.content)
            for m in db.get_messages(path, body.conversation_id, last_n=HISTORY_MESSAGES)
        ]

    try:
        result = answer_question(services, body.question, body.retrieval_mode, history)
    except AnswerGenerationError as err:
        logger.warning("LLM error (%s): %s", err.cause.code, err.cause)
        raise _llm_error(services, err, body.retrieval_mode) from err

    conversation_id = body.conversation_id
    if conversation_id is None:
        conversation_id = uuid.uuid4().hex
        db.create_conversation(path, conversation_id, body.question[:TITLE_CHARS])
    db.add_message(path, conversation_id=conversation_id, role="user", content=body.question)
    db.add_message(
        path,
        conversation_id=conversation_id,
        role="assistant",
        content=result.answer,
        sources_json=json.dumps([s.model_dump() for s in result.sources]),
        answer_mode=result.answer_mode,
    )
    return ChatResponse(
        conversation_id=conversation_id,
        answer=result.answer,
        answer_mode=result.answer_mode,
        retrieval_mode=body.retrieval_mode,
        model=result.model,
        latency_ms=int((time.perf_counter() - started) * 1000),
        sources=result.sources,
    )


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(services: Services = Depends(get_services)) -> list[ConversationOut]:
    return [
        ConversationOut(id=c.id, title=c.title, created_at=c.created_at)
        for c in db.list_conversations(services.db_path)
    ]


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def conversation_messages(conversation_id: str, services: Services = Depends(get_services)) -> list[MessageOut]:
    if db.get_conversation(services.db_path, conversation_id) is None:
        raise ApiError(404, "not_found", "Conversation not found.")
    out: list[MessageOut] = []
    for m in db.get_messages(services.db_path, conversation_id):
        sources = _sources_adapter.validate_json(m.sources_json) if m.sources_json else None
        out.append(
            MessageOut(
                id=m.id,
                role=m.role,  # type: ignore[arg-type]  # constrained by the CHECK constraint
                content=m.content,
                answer_mode=m.answer_mode,  # type: ignore[arg-type]
                sources=sources,
                created_at=m.created_at,
            )
        )
    return out


@router.get("/demo/questions", response_model=DemoQuestionsResponse)
def demo_questions(services: Services = Depends(get_services)) -> DemoQuestionsResponse:
    if not services.settings.demo_mode:
        raise ApiError(404, "not_found", "Demo questions are only available in demo mode.")
    try:
        raw = (DEMO_DIR / "sample_questions.json").read_text(encoding="utf-8")
        questions = TypeAdapter(list[str]).validate_python(json.loads(raw)["questions"])
    except (OSError, KeyError, ValueError, ValidationError) as exc:
        raise ApiError(500, "demo_questions_unavailable", "Sample questions could not be loaded.") from exc
    return DemoQuestionsResponse(questions=questions)


@debug_router.post("/debug/search", response_model=DebugSearchResponse)
def debug_search(body: DebugSearchRequest, services: Services = Depends(get_services)) -> DebugSearchResponse:
    """Development-only: inspect ranked retrieval results and scores without calling the LLM."""
    results = search(services, body.query, body.retrieval_mode)
    return DebugSearchResponse(
        retrieval_mode=body.retrieval_mode,
        passes_gate=passes_relevance_gate(results, services.settings.min_semantic_score),
        results=[
            DebugSearchResult(
                chunk_id=r.chunk_id,
                document_name=r.document_name,
                page=r.page,
                semantic_score=r.semantic_score,
                bm25_score=r.bm25_score,
                rrf_score=r.rrf_score,
                content=r.content,
            )
            for r in results
        ],
    )
