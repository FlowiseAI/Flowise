#!/usr/bin/env python3
"""
Built-in helper — minimal stdlib-only DOCX text extractor.

Materialised by `SandboxSession` under `/home/user/helpers/docx_extract.py`.

Invocation contract
-------------------
    python3 /home/user/helpers/docx_extract.py <docx_path>

Scope
-----
A `.docx` is a zip archive whose `word/document.xml` carries the body
text inside `<w:p>` (paragraph) → `<w:r>` (run) → `<w:t>` (text)
elements. We walk that tree with `xml.etree.ElementTree` and emit one
line of plain text per paragraph. Tables, hyperlinks, footnotes, and
revision tracking are intentionally not handled — pandoc /
python-docx / mammoth are the right tools when fidelity matters; this
helper is the predictable fallback when the sandbox image ships none of
them.

Empty paragraphs produce empty lines so list structure is preserved at
a coarse level. Whitespace inside a `<w:t>` element is preserved
verbatim (`xml:space="preserve"` is the DOCX default).

Output
------
One line per paragraph on stdout, in document order.

Exit codes
----------
  0  success; text written to stdout.
  1  not a valid DOCX (zip parse failure, missing word/document.xml,
     or the document body has no extractable text).
  2  bad usage (wrong number of args).
"""

import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
DOCUMENT_PART = "word/document.xml"


def _paragraph_text(paragraph: ET.Element) -> str:
    """Concatenate all `<w:t>` text within a paragraph, in tree order."""
    parts: list[str] = []
    for t in paragraph.iter(f"{{{W_NS}}}t"):
        parts.append(t.text or "")
    return "".join(parts)


def extract_text(docx_path: Path) -> str | None:
    """Return paragraph-joined plain text, or `None` if the file isn't a
    parseable DOCX. Empty paragraphs are kept so callers can roughly
    reason about list structure."""
    try:
        with zipfile.ZipFile(docx_path) as z:
            try:
                xml_bytes = z.read(DOCUMENT_PART)
            except KeyError:
                return None
    except zipfile.BadZipFile:
        return None

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return None

    body = root.find(f"{{{W_NS}}}body")
    if body is None:
        return None

    lines = [_paragraph_text(p) for p in body.iter(f"{{{W_NS}}}p")]
    if not any(line.strip() for line in lines):
        return None
    return "\n".join(lines)


def main() -> None:
    if len(sys.argv) != 2:
        sys.stderr.write("usage: docx_extract.py <docx_path>\n")
        sys.exit(2)

    docx_path = Path(sys.argv[1])
    if not docx_path.exists():
        sys.stderr.write(f"file not found: {docx_path}\n")
        sys.exit(1)

    text = extract_text(docx_path)
    if text is None:
        sys.stderr.write(
            f"no extractable text in {docx_path}; "
            "the file is either not a DOCX, lacks a word/document.xml, or "
            "is empty. Try `pandoc` or `unzip -p {file} word/document.xml`.\n"
        )
        sys.exit(1)
    sys.stdout.write(text)


if __name__ == "__main__":
    main()
