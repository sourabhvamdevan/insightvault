"""All Pydantic request/response models for the API."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

RetrievalMode = Literal["hybrid", "semantic", "keyword"]
AnswerMode = Literal["generated", "retrieval_only", "no_answer"]
DocumentStatus = Literal["processing", "ready", "failed"]
KbStatus = Literal["empty", "processing", "ready", "degraded"]


# ---------------------------------------------------------------- errors


class ErrorDetail(BaseModel):
    code: str
    message: str
    document_id: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ---------------------------------------------------------------- documents


class DocumentOut(BaseModel):
    id: str
    filename: str
    file_size: int
    page_count: int | None
    status: DocumentStatus
    error_message: str | None
    chunk_count: int
    uploaded_at: str


# ---------------------------------------------------------------- health


class LLMHealth(BaseModel):
    reachable: bool
    model: str | None
    model_available: bool


class HealthResponse(BaseModel):
    status: Literal["ok"]
    demo_mode: bool
    index_vectors: int
    llm: LLMHealth


# ---------------------------------------------------------------- chat


Question = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: Question
    conversation_id: str | None = None
    retrieval_mode: RetrievalMode = "hybrid"


class SourceOut(BaseModel):
    ref: int
    chunk_id: int
    document_id: str
    document_name: str
    page: int
    content: str
    semantic_score: float | None
    bm25_score: float | None
    rrf_score: float
    cited: bool


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    answer_mode: AnswerMode
    retrieval_mode: RetrievalMode
    model: str | None
    latency_ms: int
    sources: list[SourceOut]


class LLMErrorResponse(BaseModel):
    """Error body for 503/504 from the LLM: still carries the retrieved evidence."""

    error: ErrorDetail
    retrieval_mode: RetrievalMode
    sources: list[SourceOut]


class ConversationOut(BaseModel):
    id: str
    title: str
    created_at: str


class MessageOut(BaseModel):
    id: int
    role: Literal["user", "assistant"]
    content: str
    answer_mode: AnswerMode | None
    sources: list[SourceOut] | None
    created_at: str


# ---------------------------------------------------------------- analytics


class RecentQuestionOut(BaseModel):
    question: str
    asked_at: str
    answer_mode: AnswerMode | None


class AnalyticsResponse(BaseModel):
    total_documents: int
    ready_documents: int
    total_chunks: int
    total_questions: int
    index_vectors: int
    recent_documents: list[DocumentOut]
    recent_questions: list[RecentQuestionOut]
    kb_status: KbStatus


# ---------------------------------------------------------------- demo / debug


class DemoQuestionsResponse(BaseModel):
    questions: list[str]


class DebugSearchRequest(BaseModel):
    query: Question
    retrieval_mode: RetrievalMode = "hybrid"


class DebugSearchResult(BaseModel):
    chunk_id: int
    document_name: str
    page: int
    semantic_score: float | None
    bm25_score: float | None
    rrf_score: float
    content: str


class DebugSearchResponse(BaseModel):
    retrieval_mode: RetrievalMode
    passes_gate: bool
    results: list[DebugSearchResult]
