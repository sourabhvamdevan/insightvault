"""GET /api/health"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas import HealthResponse, LLMHealth
from app.services import Services, get_services

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(services: Services = Depends(get_services)) -> HealthResponse:
    llm = services.llm.status()
    return HealthResponse(
        status="ok",
        demo_mode=services.settings.demo_mode,
        index_vectors=services.vector_store.ntotal,
        llm=LLMHealth(reachable=llm.reachable, model=llm.model, model_available=llm.model_available),
    )
