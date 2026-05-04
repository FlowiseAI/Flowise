#!/usr/bin/env python3
"""
Built-in helper — minimal stdlib-only PDF text extractor.

Materialised by `SandboxSession` under the helpers directory inside every
Skill sandbox VM (default: `/home/user/helpers/pdf_extract.py`). The
runtime points the LLM at this script as the *primary* command for PDF
inputs so the skill author never has to ship their own.

Invocation contract
-------------------
    python3 /home/user/helpers/pdf_extract.py <pdf_path>

Scope
-----
Designed for the simple, predictable PDFs we see most often in
production skill workspaces: single-page (or few-page) documents with
FlateDecode-compressed content streams and text-show operators only
(`(text) Tj`). It is deliberately NOT a general-purpose PDF parser — try
it on a real-world PDF and you may get partial output at best.

When this helper falls short, the runtime's command-recipe registry
exposes `pdftotext` (poppler-utils) and `pdfgrep` as alternatives in the
bash tool's description. The LLM is expected to escalate to one of those
when this script's output looks garbled.

Output
------
Each `(...) Tj` text-show operator becomes one line on stdout, in the
order they appear in the content stream. Empty operators produce empty
lines. The output is plain text — no PDF metadata, no positioning
information.

Exit codes
----------
  0  success; text written to stdout.
  1  PDF file not found, or no text streams could be decoded.
  2  bad usage (wrong number of args).
"""

import re
import sys
import zlib
from pathlib import Path


def _unescape_pdf_string(raw: bytes) -> bytes:
    """Resolve the small subset of PDF string escapes we actually emit.

    The PDFs this helper targets typically escape only `\\(`, `\\)`, and
    `\\\\`. Anything more exotic (octal escapes, line-continuation
    `\\<NL>`, etc.) would require a real PDF parser and is out of scope.
    """
    return (
        raw.replace(b"\\\\", b"\x00BS\x00")  # placeholder so the next two replaces don't double-eat
        .replace(b"\\(", b"(")
        .replace(b"\\)", b")")
        .replace(b"\x00BS\x00", b"\\")
    )


def extract_text(pdf_bytes: bytes) -> str:
    """Walk every `<<...>> stream ... endstream` block and harvest Tj text.

    We only handle FlateDecode-compressed streams (the default for
    Python-generated PDFs and most simple producers). Other filters
    (`ASCIIHexDecode`, `RunLengthDecode`, etc.) are skipped silently
    rather than mis-decoded; the caller will see an empty result and
    can escalate to `pdftotext`.
    """
    out: list[str] = []
    found_any_stream = False

    for header_match in re.finditer(rb"<<(.*?)>>\s*stream\n", pdf_bytes, re.DOTALL):
        header = header_match.group(1)
        stream_start = header_match.end()
        stream_end = pdf_bytes.find(b"\nendstream", stream_start)
        if stream_end == -1:
            continue
        found_any_stream = True
        stream_data = pdf_bytes[stream_start:stream_end]

        if b"/FlateDecode" in header:
            try:
                decoded = zlib.decompress(stream_data)
            except zlib.error:
                continue
        elif b"/Filter" in header:
            continue
        else:
            decoded = stream_data

        for tj_match in re.finditer(rb"\((.*?)\)\s*Tj", decoded, re.DOTALL):
            text = _unescape_pdf_string(tj_match.group(1))
            try:
                out.append(text.decode("latin-1"))
            except UnicodeDecodeError:
                out.append(text.decode("latin-1", errors="replace"))

    if not found_any_stream:
        return ""
    return "\n".join(out)


def main() -> None:
    if len(sys.argv) != 2:
        sys.stderr.write("usage: pdf_extract.py <pdf_path>\n")
        sys.exit(2)

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        sys.stderr.write(f"file not found: {pdf_path}\n")
        sys.exit(1)

    text = extract_text(pdf_path.read_bytes())
    if not text:
        sys.stderr.write(
            f"no decodable text streams in {pdf_path}; "
            "the file is either not a FlateDecode PDF or is empty. "
            "Try `pdftotext` or `pdfgrep` instead.\n"
        )
        sys.exit(1)
    sys.stdout.write(text)


if __name__ == "__main__":
    main()
