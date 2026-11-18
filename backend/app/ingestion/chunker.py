"""Token-window chunking within a single page.

Tokens are counted with the embedding model's tokenizer. Chunk text is recovered from
character offsets into the original page text, never by decoding token ids.
"""

from __future__ import annotations

import re
from bisect import bisect_right
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, Protocol

from app.ingestion.parser import PageText

MIN_CHUNK_TOKENS = 15
SNAP_FRACTION = 0.25  # look for a sentence end within the last 25% of the window

# A sentence end is '.', '?' or '!' followed by whitespace, or a newline.
_SENTENCE_END = re.compile(r"[.?!](?=\s)|\n")


class Tokenizer(Protocol):
    def __call__(self, text: str, **kwargs: Any) -> Mapping[str, Any]: ...


@dataclass(frozen=True)
class ChunkData:
    page_number: int
    chunk_index: int
    content: str
    token_count: int
    char_start: int
    char_end: int


def token_offsets(tokenizer: Tokenizer, text: str) -> list[tuple[int, int]]:
    encoded = tokenizer(
        text,
        add_special_tokens=False,
        return_offsets_mapping=True,
        verbose=False,
    )
    return [(int(s), int(e)) for s, e in encoded["offset_mapping"]]


def _snap_end(text: str, region_start: int, char_end: int, floor: int) -> int:
    """Return the char position just after the last sentence end in [region_start, char_end]."""
    best = -1
    for match in _SENTENCE_END.finditer(text, region_start, min(len(text), char_end + 1)):
        end = match.start() if match.group() == "\n" else match.start() + 1
        if floor < end <= char_end:
            best = end
    return best if best != -1 else char_end


def chunk_page(
    page: PageText,
    tokenizer: Tokenizer,
    *,
    chunk_size: int,
    overlap: int,
    start_index: int = 0,
    min_tokens: int = MIN_CHUNK_TOKENS,
) -> list[ChunkData]:
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size")
    text = page.text
    offsets = token_offsets(tokenizer, text)
    n = len(offsets)
    if n == 0:
        return []
    ends = [e for _, e in offsets]

    windows: list[tuple[int, int, int, int]] = []  # (tok_start, tok_end, char_start, char_end)
    tok_start = 0
    while True:
        tok_end = min(tok_start + chunk_size, n)
        char_start = offsets[tok_start][0]
        char_end = offsets[tok_end - 1][1]
        if tok_end < n:
            snap_tok = tok_start + int(chunk_size * (1 - SNAP_FRACTION))
            snapped = _snap_end(text, offsets[snap_tok][0], char_end, floor=char_start)
            if snapped != char_end:
                char_end = snapped
                tok_end = max(bisect_right(ends, char_end), tok_start + 1)
        windows.append((tok_start, tok_end, char_start, char_end))
        if tok_end >= n:
            break
        tok_start = max(tok_end - overlap, tok_start + 1)

    chunks: list[ChunkData] = []
    only_chunk = len(windows) == 1
    for tok_s, tok_e, c_s, c_e in windows:
        token_count = tok_e - tok_s
        content = text[c_s:c_e]
        if not content.strip():
            continue
        if token_count < min_tokens and not only_chunk:
            continue
        chunks.append(
            ChunkData(
                page_number=page.page_number,
                chunk_index=start_index + len(chunks),
                content=content,
                token_count=token_count,
                char_start=c_s,
                char_end=c_e,
            )
        )
    return chunks


def chunk_pages(
    pages: Sequence[PageText],
    tokenizer: Tokenizer,
    *,
    chunk_size: int,
    overlap: int,
) -> list[ChunkData]:
    """Chunk every page independently; chunk_index is sequential across the document."""
    out: list[ChunkData] = []
    for page in pages:
        out.extend(
            chunk_page(page, tokenizer, chunk_size=chunk_size, overlap=overlap, start_index=len(out))
        )
    return out
