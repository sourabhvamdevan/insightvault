from __future__ import annotations

import sqlite3
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.generation.llm_provider import LLMTimeoutError, LLMUnavailableError, ModelNotFoundError
from app.main import create_app
from app.retrieval.embedder import Embedder
from tests.conftest import SAMPLE_DIR, FakeProvider, make_settings

NO_ANSWER = "I could not find this in the uploaded documents."


def upload(client: TestClient, path: Path, name: str | None = None) -> tuple[int, dict]:
    with path.open("rb") as fh:
        resp = client.post("/api/documents/upload", files={"file": (name or path.name, fh, "application/pdf")})
    return resp.status_code, resp.json()


def db_count(settings: Settings, sql: str, params: tuple = ()) -> int:
    conn = sqlite3.connect(settings.database_path)
    try:
        return int(conn.execute(sql, params).fetchone()[0])
    finally:
        conn.close()


@pytest.fixture
def remote_doc(client: TestClient) -> dict:
    status, body = upload(client, SAMPLE_DIR / "Remote_Work_Policy.pdf")
    assert status == 202 and body["status"] == "processing"
    doc = client.get(f"/api/documents/{body['id']}").json()
    assert doc["status"] == "ready"
    return doc


# ---------------------------------------------------------------- health


def test_health_shape(client: TestClient) -> None:
    body = client.get("/api/health").json()
    assert body == {
        "status": "ok",
        "demo_mode": False,
        "index_vectors": 0,
        "llm": {"reachable": True, "model": "fake-model", "model_available": True},
    }


def test_unknown_route_uses_error_shape(client: TestClient) -> None:
    resp = client.get("/api/nope")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


# ---------------------------------------------------------------- upload validation


def test_upload_rejects_wrong_extension(client: TestClient) -> None:
    status, body = upload(client, SAMPLE_DIR / "Remote_Work_Policy.pdf", name="policy.txt")
    assert status == 400 and body["error"]["code"] == "invalid_file_type"


def test_upload_rejects_bad_magic_bytes(client: TestClient, tmp_path: Path) -> None:
    fake = tmp_path / "fake.pdf"
    fake.write_bytes(b"<html>not a pdf</html>")
    status, body = upload(client, fake)
    assert status == 400 and body["error"]["code"] == "invalid_file_type"
    assert list((client.app.state.services.settings.document_storage_path).iterdir()) == []


def test_upload_rejects_too_large(tmp_path: Path, embedder: Embedder) -> None:
    settings = make_settings(tmp_path / "small", max_file_size_mb=1)
    big = tmp_path / "big.pdf"
    big.write_bytes(b"%PDF-1.4\n" + b"0" * (1024 * 1024 + 10))
    with TestClient(create_app(settings, llm_provider=FakeProvider())) as client:
        status, body = upload(client, big)
        assert status == 413 and body["error"]["code"] == "file_too_large"
        # Over the declared limit, rejected from Content-Length before the body is parsed.
        bigger = tmp_path / "bigger.pdf"
        bigger.write_bytes(b"%PDF-1.4\n" + b"0" * (3 * 1024 * 1024))
        status, body = upload(client, bigger)
        assert status == 413
        assert client.get("/api/documents").json() == []


def test_upload_duplicate_returns_409(client: TestClient, remote_doc: dict) -> None:
    status, body = upload(client, SAMPLE_DIR / "Remote_Work_Policy.pdf", name="copy.pdf")
    assert status == 409
    assert body["error"]["code"] == "duplicate_document"
    assert body["error"]["document_id"] == remote_doc["id"]


def test_scanned_pdf_fails_with_explanation(
    client: TestClient, pdf_factory: Callable[[str, list[str]], Path]
) -> None:
    blank = pdf_factory("scan.pdf", ["", "   "])
    status, body = upload(client, blank)
    assert status == 202
    doc = client.get(f"/api/documents/{body['id']}").json()
    assert doc["status"] == "failed"
    assert doc["error_message"] == "No extractable text. Scanned PDFs are not supported."
    assert doc["page_count"] == 2


def test_corrupted_pdf_fails(client: TestClient, tmp_path: Path) -> None:
    bad = tmp_path / "corrupt.pdf"
    bad.write_bytes(b"%PDF-1.4 this is not really a pdf")
    status, body = upload(client, bad)
    doc = client.get(f"/api/documents/{body['id']}").json()
    assert doc["status"] == "failed"
    assert "Traceback" not in (doc["error_message"] or "")


# ---------------------------------------------------------------- documents + delete


def test_ingestion_counts_match(client: TestClient, settings: Settings, remote_doc: dict) -> None:
    rows = db_count(settings, "SELECT COUNT(*) FROM chunks WHERE document_id = ?", (remote_doc["id"],))
    assert remote_doc["chunk_count"] == rows > 0
    assert client.get("/api/health").json()["index_vectors"] == rows
    assert remote_doc["page_count"] == 4
    assert "stored_name" not in remote_doc and "sha256" not in remote_doc


def test_delete_cascade(client: TestClient, settings: Settings, remote_doc: dict) -> None:
    stored = list(settings.document_storage_path.iterdir())
    assert len(stored) == 1
    resp = client.delete(f"/api/documents/{remote_doc['id']}")
    assert resp.status_code == 204
    assert db_count(settings, "SELECT COUNT(*) FROM chunks") == 0
    assert db_count(settings, "SELECT COUNT(*) FROM documents") == 0
    assert client.get("/api/health").json()["index_vectors"] == 0
    assert list(settings.document_storage_path.iterdir()) == []
    assert client.delete(f"/api/documents/{remote_doc['id']}").status_code == 404
    assert client.get(f"/api/documents/{remote_doc['id']}").status_code == 404


def test_index_survives_restart(settings: Settings, embedder: Embedder) -> None:
    with TestClient(create_app(settings, llm_provider=FakeProvider())) as client:
        upload(client, SAMPLE_DIR / "IT_Security_Policy.pdf")
        vectors = client.get("/api/health").json()["index_vectors"]
    assert vectors > 0
    with TestClient(create_app(settings, llm_provider=FakeProvider())) as client:
        assert client.get("/api/health").json()["index_vectors"] == vectors
    # A missing index file is rebuilt from the chunks in SQLite.
    settings.faiss_index_path.unlink()
    with TestClient(create_app(settings, llm_provider=FakeProvider())) as client:
        assert client.get("/api/health").json()["index_vectors"] == vectors


# ---------------------------------------------------------------- chat


def test_chat_generated_with_citations(client: TestClient, fake_llm: FakeProvider, remote_doc: dict) -> None:
    resp = client.post("/api/chat", json={"question": "  How many days can I work remotely?  "})
    assert resp.status_code == 200
    body = resp.json()
    assert body["answer_mode"] == "generated"
    assert body["answer"] == fake_llm.reply
    assert body["retrieval_mode"] == "hybrid"
    assert body["model"] == "fake-model"
    assert body["sources"], "sources must be returned"
    assert [s["ref"] for s in body["sources"]] == list(range(1, len(body["sources"]) + 1))
    assert body["sources"][0]["cited"] is True
    assert all(s["cited"] is False for s in body["sources"][1:])
    top = body["sources"][0]
    assert (top["document_name"], top["page"]) == ("Remote_Work_Policy.pdf", 2)
    assert top["rrf_score"] > 0 and top["semantic_score"] is not None

    # The prompt sent to the provider carries the numbered sources and the trimmed question.
    sent = fake_llm.calls[-1]
    assert sent[0].role == "system"
    assert sent[-1].content.startswith("<sources>\n[1] (Remote_Work_Policy.pdf, page 2)")
    assert sent[-1].content.endswith("Question: How many days can I work remotely?")

    # Conversation persisted; a follow-up includes history.
    cid = body["conversation_id"]
    convs = client.get("/api/conversations").json()
    assert convs[0]["id"] == cid and convs[0]["title"] == "How many days can I work remotely?"
    follow = client.post("/api/chat", json={"question": "And the anchor day?", "conversation_id": cid})
    assert follow.status_code == 200
    assert [m.role for m in fake_llm.calls[-1]] == ["system", "user", "assistant", "user"]
    messages = client.get(f"/api/conversations/{cid}/messages").json()
    assert [m["role"] for m in messages] == ["user", "assistant", "user", "assistant"]
    assert messages[1]["sources"][0]["cited"] is True
    assert messages[0]["sources"] is None


def test_chat_uncited_answer_keeps_sources(client: TestClient, fake_llm: FakeProvider, remote_doc: dict) -> None:
    fake_llm.reply = "Up to three days per week."
    body = client.post("/api/chat", json={"question": "How many remote days per week?"}).json()
    assert body["answer_mode"] == "generated"
    assert body["sources"] and all(not s["cited"] for s in body["sources"])


def test_chat_no_answer_paths(client: TestClient, fake_llm: FakeProvider) -> None:
    empty = client.post("/api/chat", json={"question": "What is the remote work policy?"}).json()
    assert empty["answer_mode"] == "no_answer" and empty["answer"] == NO_ANSWER
    upload(client, SAMPLE_DIR / "Remote_Work_Policy.pdf")
    unrelated = client.post("/api/chat", json={"question": "What is the recipe for banana bread?"}).json()
    assert unrelated["answer_mode"] == "no_answer"
    assert unrelated["answer"] == NO_ANSWER
    assert unrelated["sources"] == []
    assert fake_llm.calls == []  # the LLM is skipped


def test_chat_model_says_not_found(client: TestClient, fake_llm: FakeProvider, remote_doc: dict) -> None:
    fake_llm.reply = NO_ANSWER
    body = client.post("/api/chat", json={"question": "Who approves remote work abroad?"}).json()
    assert body["answer_mode"] == "no_answer"


@pytest.mark.parametrize(
    ("error", "status", "code", "hint"),
    [
        (LLMUnavailableError("down"), 503, "llm_unavailable", "ollama serve"),
        (ModelNotFoundError("missing"), 503, "model_not_found", "ollama pull llama3.2:3b"),
        (LLMTimeoutError("slow"), 504, "llm_timeout", "seconds"),
    ],
)
def test_chat_llm_errors_return_evidence(
    client: TestClient,
    fake_llm: FakeProvider,
    settings: Settings,
    remote_doc: dict,
    error: Exception,
    status: int,
    code: str,
    hint: str,
) -> None:
    fake_llm.error = error  # type: ignore[assignment]
    resp = client.post("/api/chat", json={"question": "How many days can I work remotely?"})
    assert resp.status_code == status
    body = resp.json()
    assert body["error"]["code"] == code
    assert hint in body["error"]["message"]
    assert body["sources"] and body["sources"][0]["document_name"] == "Remote_Work_Policy.pdf"
    assert db_count(settings, "SELECT COUNT(*) FROM messages") == 0


def test_chat_validation(client: TestClient) -> None:
    for payload in ({"question": "   "}, {"question": ""}, {"question": "x" * 1001}, {"question": "ok", "retrieval_mode": "magic"}):
        resp = client.post("/api/chat", json=payload)
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "validation_error"
    resp = client.post("/api/chat", json={"question": "hi", "conversation_id": "missing"})
    assert resp.status_code == 404


def test_chat_retrieval_modes(client: TestClient, remote_doc: dict) -> None:
    for mode in ("semantic", "keyword"):
        body = client.post("/api/chat", json={"question": "RW-120 home office allowance", "retrieval_mode": mode}).json()
        assert body["retrieval_mode"] == mode
        assert body["sources"]


# ---------------------------------------------------------------- analytics


def test_analytics_reflects_database(client: TestClient, remote_doc: dict) -> None:
    client.post("/api/chat", json={"question": "How many days can I work remotely?"})
    client.post("/api/chat", json={"question": "What is the recipe for banana bread?"})
    body = client.get("/api/analytics").json()
    assert body["total_documents"] == 1
    assert body["ready_documents"] == 1
    assert body["total_chunks"] == remote_doc["chunk_count"] == body["index_vectors"]
    assert body["total_questions"] == 2
    assert body["kb_status"] == "ready"
    assert [q["answer_mode"] for q in body["recent_questions"]] == ["no_answer", "generated"]
    assert body["recent_documents"][0]["id"] == remote_doc["id"]


def test_analytics_empty_and_degraded(client: TestClient, fake_llm: FakeProvider, remote_doc: dict) -> None:
    fake_llm.error = LLMUnavailableError("down")
    assert client.get("/api/analytics").json()["kb_status"] == "degraded"
    client.delete(f"/api/documents/{remote_doc['id']}")
    assert client.get("/api/analytics").json()["kb_status"] == "empty"


# ---------------------------------------------------------------- demo mode


@pytest.fixture
def demo_client(tmp_path: Path, embedder: Embedder) -> Iterator[TestClient]:
    from app.generation.llm_provider import NullProvider

    settings = make_settings(tmp_path / "demo", demo_mode=True, app_env="production")
    with TestClient(create_app(settings, llm_provider=NullProvider())) as client:
        yield client


def test_demo_mode(demo_client: TestClient) -> None:
    health = demo_client.get("/api/health").json()
    assert health["demo_mode"] is True and health["index_vectors"] > 0
    docs = demo_client.get("/api/documents").json()
    assert len(docs) == len(list(SAMPLE_DIR.glob("*.pdf")))
    assert all(d["status"] == "ready" for d in docs)

    status, body = upload(demo_client, SAMPLE_DIR / "Remote_Work_Policy.pdf", name="new.pdf")
    assert status == 403 and body["error"]["code"] == "demo_read_only"
    resp = demo_client.delete(f"/api/documents/{docs[0]['id']}")
    assert resp.status_code == 403

    chat = demo_client.post("/api/chat", json={"question": "How many days can I work remotely?"}).json()
    assert chat["answer_mode"] == "retrieval_only"
    assert chat["model"] is None
    assert chat["sources"][0]["document_name"] == "Remote_Work_Policy.pdf"

    questions = demo_client.get("/api/demo/questions").json()["questions"]
    assert len(questions) >= 4
    assert demo_client.post("/api/debug/search", json={"query": "x"}).status_code == 404
    assert demo_client.get("/api/analytics").json()["kb_status"] == "ready"


def test_demo_questions_hidden_outside_demo(client: TestClient) -> None:
    assert client.get("/api/demo/questions").status_code == 404
