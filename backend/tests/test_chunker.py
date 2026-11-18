from __future__ import annotations

from app.ingestion.chunker import chunk_page, chunk_pages, token_offsets
from app.ingestion.parser import PageText, clean_page_text
from app.retrieval.embedder import Embedder

WORDS = (
    "river stone garden window paper music orange planet silver forest market bridge "
    "candle winter yellow doctor engine pocket travel letter"
).split()


def words(n: int, offset: int = 0) -> str:
    """n common words with no sentence punctuation (so no snapping happens)."""
    return " ".join(WORDS[(i + offset) % len(WORDS)] for i in range(n))


def test_window_size_and_overlap(embedder: Embedder) -> None:
    page = PageText(1, words(600))
    chunks = chunk_page(page, embedder.tokenizer, chunk_size=200, overlap=40)
    offsets = token_offsets(embedder.tokenizer, page.text)
    assert len(offsets) == 600  # each word is one word-piece
    assert [c.token_count for c in chunks] == [200, 200, 200, 120]
    # Step is 160 tokens: chunk i starts at token 160*i, so consecutive chunks share 40 tokens.
    for i, c in enumerate(chunks):
        assert c.char_start == offsets[160 * i][0]
    for a, b in zip(chunks, chunks[1:]):
        shared = page.text[b.char_start : a.char_end]
        assert len(token_offsets(embedder.tokenizer, shared)) == 40


def test_short_page_gives_one_chunk(embedder: Embedder) -> None:
    page = PageText(3, "Employees receive 24 days of paid annual leave per year.")
    chunks = chunk_page(page, embedder.tokenizer, chunk_size=200, overlap=40)
    assert len(chunks) == 1
    assert chunks[0].content == page.text
    assert chunks[0].page_number == 3


def test_chunks_never_span_pages(embedder: Embedder) -> None:
    pages = [PageText(1, words(250)), PageText(2, words(30, offset=3)), PageText(4, words(410, offset=7))]
    chunks = chunk_pages(pages, embedder.tokenizer, chunk_size=200, overlap=40)
    by_page = {p.page_number: p.text for p in pages}
    assert [c.chunk_index for c in chunks] == list(range(len(chunks)))
    assert {c.page_number for c in chunks} == {1, 2, 4}
    for c in chunks:
        assert c.content in by_page[c.page_number]
        assert by_page[c.page_number][c.char_start : c.char_end] == c.content


def test_sentence_snapping(embedder: Embedder) -> None:
    # A sentence end after ~180 tokens falls inside the last 25% (tokens 150..200) of the window.
    text = words(178) + ". " + words(300, offset=5)
    page = PageText(1, text)
    first = chunk_page(page, embedder.tokenizer, chunk_size=200, overlap=40)[0]
    assert first.content.endswith(".")
    assert 150 <= first.token_count < 200
    assert first.content == text[first.char_start : first.char_end]


def test_no_snap_when_sentence_end_too_early(embedder: Embedder) -> None:
    # A sentence end at ~50 tokens is outside the last 25%, so the hard boundary is kept.
    text = words(50) + ". " + words(400, offset=2)
    first = chunk_page(PageText(1, text), embedder.tokenizer, chunk_size=200, overlap=40)[0]
    assert first.token_count == 200


def test_tiny_trailing_chunk_dropped(embedder: Embedder) -> None:
    page = PageText(1, words(25))
    chunks = chunk_page(page, embedder.tokenizer, chunk_size=20, overlap=0)
    assert [c.token_count for c in chunks] == [20]  # the trailing 5-token window is dropped


def test_tiny_only_chunk_kept(embedder: Embedder) -> None:
    chunks = chunk_page(PageText(1, "Policy HR-204 applies."), embedder.tokenizer, chunk_size=200, overlap=40)
    assert len(chunks) == 1
    assert chunks[0].token_count < 15


def test_offsets_recover_exact_original_text(embedder: Embedder) -> None:
    text = (
        "Policy HR-204 (Annual Leave), version v2.1: Full-time Employees receive 24 Days.\n"
        "Carried-over days must be used by 31 March.  " + words(300)
    )
    page = PageText(2, text)
    for c in chunk_page(page, embedder.tokenizer, chunk_size=60, overlap=10):
        assert c.content == text[c.char_start : c.char_end]
    first = chunk_page(page, embedder.tokenizer, chunk_size=60, overlap=10)[0]
    assert first.content.startswith("Policy HR-204 (Annual Leave), version v2.1: Full-time Employees")


def test_clean_page_text_joins_hyphenation_and_collapses_newlines() -> None:
    raw = "An exam-\nple   of\ttext\n\n\n\nNext  paragraph  "
    assert clean_page_text(raw) == "An example of text\n\nNext paragraph"
