"""GET /api/analytics: every number is read from the database or the live index."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.documents import to_document_out
from app.database import db
from app.schemas import AnalyticsResponse, KbStatus, RecentQuestionOut
from app.services import Services, get_services

router = APIRouter(tags=["analytics"])

RECENT_LIMIT = 5


def _kb_status(services: Services, counts: dict[str, int], index_vectors: int) -> KbStatus:
    if counts["total"] == 0:
        return "empty"
    if counts["processing"] > 0:
        return "processing"
    if index_vectors != db.count_chunks(services.db_path, ready_only=True):
        return "degraded"
    if not services.settings.demo_mode and not services.llm.status().reachable:
        return "degraded"
    return "ready"


@router.get("/analytics", response_model=AnalyticsResponse)
def analytics(services: Services = Depends(get_services)) -> AnalyticsResponse:
    path = services.db_path
    counts = db.count_documents(path)
    index_vectors = services.vector_store.ntotal
    return AnalyticsResponse(
        total_documents=counts["total"],
        ready_documents=counts["ready"],
        total_chunks=db.count_chunks(path),
        total_questions=db.count_questions(path),
        index_vectors=index_vectors,
        recent_documents=[to_document_out(d) for d in db.list_documents(path, limit=RECENT_LIMIT)],
        recent_questions=[
            RecentQuestionOut(question=q.question, asked_at=q.asked_at, answer_mode=q.answer_mode)  # type: ignore[arg-type]
            for q in db.recent_questions(path, limit=RECENT_LIMIT)
        ],
        kb_status=_kb_status(services, counts, index_vectors),
    )
