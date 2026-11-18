"""PDF -> list of cleaned page texts (1-based page numbers) using PyMuPDF."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import pymupdf

MIN_PAGE_CHARS = 20

_HYPHEN_BREAK = re.compile(r"(\w)-\n(\w)")
_INLINE_SPACE = re.compile(r"[ \t\f\v ]+")
_MANY_NEWLINES = re.compile(r"\n{3,}")


@dataclass(frozen=True)
class PageText:
    page_number: int  # 1-based
    text: str


@dataclass(frozen=True)
class ParsedPdf:
    page_count: int
    pages: list[PageText]  # only pages with enough text


class PdfParseError(Exception):
    """The file could not be opened or read as a PDF."""


def clean_page_text(raw: str) -> str:
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    text = _INLINE_SPACE.sub(" ", text)
    text = "\n".join(line.strip() for line in text.split("\n"))
    text = _HYPHEN_BREAK.sub(r"\1\2", text)
    text = _MANY_NEWLINES.sub("\n\n", text)
    return text.strip()


def has_enough_text(text: str) -> bool:
    return sum(1 for ch in text if not ch.isspace()) >= MIN_PAGE_CHARS


def parse_pdf(path: Path) -> ParsedPdf:
    try:
        doc = pymupdf.open(path)
    except Exception as exc:  # PyMuPDF raises several types for corrupt input
        raise PdfParseError(str(exc)) from exc
    try:
        pages: list[PageText] = []
        for index in range(doc.page_count):
            text = clean_page_text(doc[index].get_text("text"))
            if has_enough_text(text):
                pages.append(PageText(page_number=index + 1, text=text))
        return ParsedPdf(page_count=doc.page_count, pages=pages)
    except Exception as exc:
        raise PdfParseError(str(exc)) from exc
    finally:
        doc.close()
