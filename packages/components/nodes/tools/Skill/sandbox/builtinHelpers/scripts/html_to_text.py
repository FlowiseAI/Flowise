#!/usr/bin/env python3
"""
Built-in helper — minimal stdlib-only HTML → plain text converter.

Materialised by `SandboxSession` under `/home/user/helpers/html_to_text.py`.

Invocation contract
-------------------
    python3 /home/user/helpers/html_to_text.py <html_path>

Scope
-----
We use Python's stdlib `html.parser.HTMLParser` to walk the document
and emit only text content, dropping `<script>` and `<style>` blocks
entirely. Block-level elements introduce a single newline so lists
and paragraphs stay roughly aligned without inventing markdown
structure.

Whitespace is collapsed (runs of spaces / tabs / newlines → single
space; consecutive blank lines → at most one). Entities (`&amp;`,
`&#39;`, …) are decoded by the parser automatically.

Output
------
Plain text on stdout, one logical block per line.

Exit codes
----------
  0  success; text written to stdout.
  1  file unreadable, empty, or contains no extractable text.
  2  bad usage (wrong number of args).
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

# Tags whose content should be ignored entirely.
SKIP_TAGS = {"script", "style", "head", "title", "noscript"}

# Tags that introduce a paragraph break in the output. Inline tags
# (a, span, em, strong, code, …) are deliberately omitted so they don't
# fragment the prose.
BLOCK_TAGS = {
    "p", "br", "div", "section", "article", "header", "footer", "nav",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "li", "ul", "ol", "tr", "table", "blockquote", "pre", "hr"
}


class _PlainTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in SKIP_TAGS:
            self._skip_depth += 1
        elif tag in BLOCK_TAGS:
            self._chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in SKIP_TAGS:
            self._skip_depth = max(0, self._skip_depth - 1)
        elif tag in BLOCK_TAGS:
            self._chunks.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            return
        self._chunks.append(data)

    def text(self) -> str:
        joined = "".join(self._chunks)
        # Collapse runs of whitespace within a line, keep newline boundaries.
        lines = [re.sub(r"[ \t\r\f\v]+", " ", l).strip() for l in joined.splitlines()]
        # Drop empty leading/trailing lines and collapse 2+ blanks to 1.
        out: list[str] = []
        prev_blank = False
        for l in lines:
            if not l:
                if not prev_blank and out:
                    out.append("")
                prev_blank = True
            else:
                out.append(l)
                prev_blank = False
        while out and not out[-1]:
            out.pop()
        return "\n".join(out)


def extract_text(html_bytes: bytes) -> str:
    parser = _PlainTextExtractor()
    parser.feed(html_bytes.decode("utf-8", errors="replace"))
    parser.close()
    return parser.text()


def main() -> None:
    if len(sys.argv) != 2:
        sys.stderr.write("usage: html_to_text.py <html_path>\n")
        sys.exit(2)

    html_path = Path(sys.argv[1])
    if not html_path.exists():
        sys.stderr.write(f"file not found: {html_path}\n")
        sys.exit(1)

    text = extract_text(html_path.read_bytes())
    if not text.strip():
        sys.stderr.write(f"no extractable text in {html_path}.\n")
        sys.exit(1)
    sys.stdout.write(text)


if __name__ == "__main__":
    main()
