"""SQLite access: connection helper, schema initialisation and query functions.

Uses the standard library sqlite3 module with parameterised SQL only.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  filename      TEXT NOT NULL,
  stored_name   TEXT NOT NULL,
  sha256        TEXT NOT NULL UNIQUE,
  file_size     INTEGER NOT NULL,
  page_count    INTEGER,
  status        TEXT NOT NULL CHECK (status IN ('processing','ready','failed')),
  error_message TEXT,
  chunk_count   INTEGER NOT NULL DEFAULT 0,
  uploaded_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chunks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  page_number   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  token_count   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);

CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
  sources_json    TEXT,
  answer_mode     TEXT,
  created_at      TEXT NOT NULL
);
"""


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@contextmanager
def connect(db_path: Path) -> Iterator[sqlite3.Connection]:
    """Open a connection with foreign keys on; commit on success, roll back on error."""
    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with connect(db_path) as conn:
        conn.executescript(SCHEMA)


# ---------------------------------------------------------------- rows


@dataclass(frozen=True)
class DocumentRow:
    id: str
    filename: str
    stored_name: str
    sha256: str
    file_size: int
    page_count: int | None
    status: str
    error_message: str | None
    chunk_count: int
    uploaded_at: str

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "DocumentRow":
        return cls(**{k: row[k] for k in row.keys()})


@dataclass(frozen=True)
class ChunkRow:
    id: int
    document_id: str
    document_name: str
    chunk_index: int
    page_number: int
    content: str
    token_count: int


@dataclass(frozen=True)
class NewChunk:
    chunk_index: int
    page_number: int
    content: str
    token_count: int


@dataclass(frozen=True)
class MessageRow:
    id: int
    conversation_id: str
    role: str
    content: str
    sources_json: str | None
    answer_mode: str | None
    created_at: str


@dataclass(frozen=True)
class ConversationRow:
    id: str
    title: str
    created_at: str


@dataclass(frozen=True)
class RecentQuestion:
    question: str
    asked_at: str
    answer_mode: str | None


# ---------------------------------------------------------------- documents


def insert_document(
    db_path: Path,
    *,
    document_id: str,
    filename: str,
    stored_name: str,
    sha256: str,
    file_size: int,
) -> DocumentRow:
    with connect(db_path) as conn:
        conn.execute(
            "INSERT INTO documents (id, filename, stored_name, sha256, file_size, status, uploaded_at)"
            " VALUES (?, ?, ?, ?, ?, 'processing', ?)",
            (document_id, filename, stored_name, sha256, file_size, utc_now()),
        )
    doc = get_document(db_path, document_id)
    assert doc is not None
    return doc


def get_document(db_path: Path, document_id: str) -> DocumentRow | None:
    with connect(db_path) as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
    return DocumentRow.from_row(row) if row else None


def get_document_by_sha256(db_path: Path, sha256: str) -> DocumentRow | None:
    with connect(db_path) as conn:
        row = conn.execute("SELECT * FROM documents WHERE sha256 = ?", (sha256,)).fetchone()
    return DocumentRow.from_row(row) if row else None


def list_documents(db_path: Path, limit: int | None = None) -> list[DocumentRow]:
    sql = "SELECT * FROM documents ORDER BY uploaded_at DESC, rowid DESC"
    params: tuple[int, ...] = ()
    if limit is not None:
        sql += " LIMIT ?"
        params = (limit,)
    with connect(db_path) as conn:
        rows = conn.execute(sql, params).fetchall()
    return [DocumentRow.from_row(r) for r in rows]


def mark_document_ready(db_path: Path, document_id: str, *, chunk_count: int, page_count: int) -> bool:
    with connect(db_path) as conn:
        cur = conn.execute(
            "UPDATE documents SET status = 'ready', error_message = NULL, chunk_count = ?, page_count = ?"
            " WHERE id = ?",
            (chunk_count, page_count, document_id),
        )
    return cur.rowcount > 0


def mark_document_failed(
    db_path: Path, document_id: str, *, error_message: str, page_count: int | None = None
) -> None:
    with connect(db_path) as conn:
        conn.execute(
            "UPDATE documents SET status = 'failed', error_message = ?, chunk_count = 0,"
            " page_count = COALESCE(?, page_count) WHERE id = ?",
            (error_message, page_count, document_id),
        )


def delete_document(db_path: Path, document_id: str) -> None:
    with connect(db_path) as conn:
        conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))


def list_processing_document_ids(db_path: Path) -> list[str]:
    with connect(db_path) as conn:
        rows = conn.execute("SELECT id FROM documents WHERE status = 'processing'").fetchall()
    return [r["id"] for r in rows]


def count_documents(db_path: Path) -> dict[str, int]:
    """Return counts keyed by status plus 'total'."""
    with connect(db_path) as conn:
        rows = conn.execute("SELECT status, COUNT(*) AS n FROM documents GROUP BY status").fetchall()
    counts = {"processing": 0, "ready": 0, "failed": 0}
    for r in rows:
        counts[r["status"]] = r["n"]
    counts["total"] = sum(counts.values())
    return counts


# ---------------------------------------------------------------- chunks


def insert_chunks(db_path: Path, document_id: str, chunks: Sequence[NewChunk]) -> list[int]:
    """Insert all chunks in one transaction and return their integer ids in order."""
    ids: list[int] = []
    with connect(db_path) as conn:
        for c in chunks:
            cur = conn.execute(
                "INSERT INTO chunks (document_id, chunk_index, page_number, content, token_count)"
                " VALUES (?, ?, ?, ?, ?)",
                (document_id, c.chunk_index, c.page_number, c.content, c.token_count),
            )
            assert cur.lastrowid is not None
            ids.append(int(cur.lastrowid))
    return ids


def get_chunk_ids_for_document(db_path: Path, document_id: str) -> list[int]:
    with connect(db_path) as conn:
        rows = conn.execute(
            "SELECT id FROM chunks WHERE document_id = ? ORDER BY id", (document_id,)
        ).fetchall()
    return [int(r["id"]) for r in rows]


def delete_chunks_for_document(db_path: Path, document_id: str) -> None:
    with connect(db_path) as conn:
        conn.execute("DELETE FROM chunks WHERE document_id = ?", (document_id,))


def get_chunks_by_ids(db_path: Path, chunk_ids: Sequence[int]) -> dict[int, ChunkRow]:
    if not chunk_ids:
        return {}
    placeholders = ",".join("?" for _ in chunk_ids)
    with connect(db_path) as conn:
        rows = conn.execute(
            "SELECT c.id, c.document_id, d.filename AS document_name, c.chunk_index, c.page_number,"
            " c.content, c.token_count FROM chunks c JOIN documents d ON d.id = c.document_id"
            f" WHERE c.id IN ({placeholders})",
            tuple(int(i) for i in chunk_ids),
        ).fetchall()
    return {int(r["id"]): ChunkRow(**{k: r[k] for k in r.keys()}) for r in rows}


def list_all_chunks(db_path: Path) -> list[tuple[int, str]]:
    """(chunk_id, content) for every stored chunk, ordered by id."""
    with connect(db_path) as conn:
        rows = conn.execute("SELECT id, content FROM chunks ORDER BY id").fetchall()
    return [(int(r["id"]), str(r["content"])) for r in rows]


def count_chunks(db_path: Path, *, ready_only: bool = False) -> int:
    sql = "SELECT COUNT(*) FROM chunks"
    if ready_only:
        sql += " c JOIN documents d ON d.id = c.document_id WHERE d.status = 'ready'"
    with connect(db_path) as conn:
        return int(conn.execute(sql).fetchone()[0])


# ---------------------------------------------------------------- conversations


def create_conversation(db_path: Path, conversation_id: str, title: str) -> ConversationRow:
    created = utc_now()
    with connect(db_path) as conn:
        conn.execute(
            "INSERT INTO conversations (id, title, created_at) VALUES (?, ?, ?)",
            (conversation_id, title, created),
        )
    return ConversationRow(id=conversation_id, title=title, created_at=created)


def get_conversation(db_path: Path, conversation_id: str) -> ConversationRow | None:
    with connect(db_path) as conn:
        row = conn.execute(
            "SELECT id, title, created_at FROM conversations WHERE id = ?", (conversation_id,)
        ).fetchone()
    return ConversationRow(row["id"], row["title"], row["created_at"]) if row else None


def list_conversations(db_path: Path) -> list[ConversationRow]:
    with connect(db_path) as conn:
        rows = conn.execute(
            "SELECT id, title, created_at FROM conversations ORDER BY created_at DESC, rowid DESC"
        ).fetchall()
    return [ConversationRow(r["id"], r["title"], r["created_at"]) for r in rows]


def add_message(
    db_path: Path,
    *,
    conversation_id: str,
    role: str,
    content: str,
    sources_json: str | None = None,
    answer_mode: str | None = None,
) -> int:
    with connect(db_path) as conn:
        cur = conn.execute(
            "INSERT INTO messages (conversation_id, role, content, sources_json, answer_mode, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (conversation_id, role, content, sources_json, answer_mode, utc_now()),
        )
    assert cur.lastrowid is not None
    return int(cur.lastrowid)


def get_messages(db_path: Path, conversation_id: str, last_n: int | None = None) -> list[MessageRow]:
    """Messages oldest first. With last_n, only the most recent n (still oldest first)."""
    with connect(db_path) as conn:
        if last_n is None:
            rows = conn.execute(
                "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC", (conversation_id,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?)"
                " ORDER BY id ASC",
                (conversation_id, last_n),
            ).fetchall()
    return [MessageRow(**{k: r[k] for k in r.keys()}) for r in rows]


def count_questions(db_path: Path) -> int:
    with connect(db_path) as conn:
        return int(conn.execute("SELECT COUNT(*) FROM messages WHERE role = 'user'").fetchone()[0])


def recent_questions(db_path: Path, limit: int = 5) -> list[RecentQuestion]:
    with connect(db_path) as conn:
        rows = conn.execute(
            "SELECT u.content AS question, u.created_at AS asked_at,"
            " (SELECT a.answer_mode FROM messages a WHERE a.conversation_id = u.conversation_id"
            "   AND a.role = 'assistant' AND a.id > u.id ORDER BY a.id ASC LIMIT 1) AS answer_mode"
            " FROM messages u WHERE u.role = 'user' ORDER BY u.id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [RecentQuestion(r["question"], r["asked_at"], r["answer_mode"]) for r in rows]
