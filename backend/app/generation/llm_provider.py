"""LLM providers: the LLMProvider protocol, an Ollama HTTP provider and a NullProvider (demo)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

import httpx

Role = Literal["system", "user", "assistant"]

STATUS_TIMEOUT_S = 3.0


@dataclass(frozen=True)
class ChatTurn:
    role: Role
    content: str


@dataclass(frozen=True)
class LLMStatus:
    reachable: bool
    model: str | None
    model_available: bool


class LLMError(Exception):
    code = "llm_error"
    status_code = 503


class LLMUnavailableError(LLMError):
    code = "llm_unavailable"
    status_code = 503


class ModelNotFoundError(LLMError):
    code = "model_not_found"
    status_code = 503


class LLMTimeoutError(LLMError):
    code = "llm_timeout"
    status_code = 504


class LLMProvider(Protocol):
    @property
    def model(self) -> str | None: ...

    @property
    def generates_answers(self) -> bool: ...

    def status(self) -> LLMStatus: ...

    def generate(self, messages: list[ChatTurn], *, temperature: float) -> str: ...


def _model_matches(wanted: str, available: str) -> bool:
    if wanted == available:
        return True
    # "llama3.2" is stored by Ollama as "llama3.2:latest".
    return ":" not in wanted and available == f"{wanted}:latest"


class OllamaProvider:
    def __init__(self, base_url: str, model: str, timeout_s: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout_s = timeout_s

    @property
    def model(self) -> str | None:
        return self._model

    @property
    def generates_answers(self) -> bool:
        return True

    def status(self) -> LLMStatus:
        try:
            resp = httpx.get(f"{self._base_url}/api/tags", timeout=STATUS_TIMEOUT_S)
            resp.raise_for_status()
            models = resp.json().get("models", [])
        except (httpx.HTTPError, ValueError):
            return LLMStatus(reachable=False, model=self._model, model_available=False)
        names: list[str] = []
        for m in models:
            if isinstance(m, dict):
                names.extend(str(m[key]) for key in ("name", "model") if key in m)
        available = any(_model_matches(self._model, n) for n in names)
        return LLMStatus(reachable=True, model=self._model, model_available=available)

    def generate(self, messages: list[ChatTurn], *, temperature: float) -> str:
        payload = {
            "model": self._model,
            "messages": [{"role": t.role, "content": t.content} for t in messages],
            "stream": False,
            "options": {"temperature": temperature},
        }
        try:
            resp = httpx.post(f"{self._base_url}/api/chat", json=payload, timeout=self._timeout_s)
        except httpx.TimeoutException as exc:
            raise LLMTimeoutError(str(exc)) from exc
        except httpx.HTTPError as exc:
            raise LLMUnavailableError(str(exc)) from exc
        if resp.status_code == 404:
            raise ModelNotFoundError(resp.text)
        if resp.status_code >= 400:
            raise LLMUnavailableError(f"Ollama returned HTTP {resp.status_code}: {resp.text[:200]}")
        try:
            content = resp.json()["message"]["content"]
        except (ValueError, KeyError, TypeError) as exc:
            raise LLMUnavailableError("Unexpected response from Ollama") from exc
        return str(content).strip()


class NullProvider:
    """Used in demo mode: no generation, the API returns retrieved evidence only."""

    @property
    def model(self) -> str | None:
        return None

    @property
    def generates_answers(self) -> bool:
        return False

    def status(self) -> LLMStatus:
        return LLMStatus(reachable=False, model=None, model_available=False)

    def generate(self, messages: list[ChatTurn], *, temperature: float) -> str:
        raise LLMUnavailableError("Answer generation is disabled in demo mode")
