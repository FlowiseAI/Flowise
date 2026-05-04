#!/usr/bin/env python3
"""
Built-in helper — minimal stdlib-only PPTX text extractor.

Materialised by `SandboxSession` under `/home/user/helpers/pptx_extract.py`.

Invocation contract
-------------------
    python3 /home/user/helpers/pptx_extract.py <pptx_path>

Scope
-----
A `.pptx` is a zip archive containing one XML file per slide
(`ppt/slides/slide<N>.xml`). Each slide's text fragments live inside
`<a:t>` elements (DrawingML namespace). We walk every slide in
numerical order and emit:

    === Slide <N> ===
    <every <a:t> text in tree order, joined with newlines>

Slide notes (`ppt/notesSlides/notesSlide<N>.xml`), slide masters,
themes, comments, and embedded media are intentionally not extracted.
For higher fidelity reach for `python-pptx` or `pandoc`.

Output
------
Slides separated by `=== Slide N ===` headers, one text fragment per
line within each slide, in document order.

Exit codes
----------
  0  success; text written to stdout.
  1  not a valid PPTX (zip parse failure, no slide parts, or every
     slide is empty).
  2  bad usage (wrong number of args).
"""

import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

DRAWINGML_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
SLIDE_NAME_RE = re.compile(r"^ppt/slides/slide(\d+)\.xml$")


def _ordered_slide_parts(z: zipfile.ZipFile) -> list[tuple[int, str]]:
    """Find every `ppt/slides/slideN.xml` in the archive, sorted by N."""
    matches: list[tuple[int, str]] = []
    for name in z.namelist():
        m = SLIDE_NAME_RE.match(name)
        if m:
            matches.append((int(m.group(1)), name))
    matches.sort(key=lambda t: t[0])
    return matches


def _slide_text(z: zipfile.ZipFile, part: str) -> list[str]:
    """Return every `<a:t>` text fragment from a slide, in tree order."""
    try:
        xml_bytes = z.read(part)
    except KeyError:
        return []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []
    return [t.text for t in root.iter(f"{{{DRAWINGML_NS}}}t") if t.text]


def main() -> None:
    if len(sys.argv) != 2:
        sys.stderr.write("usage: pptx_extract.py <pptx_path>\n")
        sys.exit(2)

    pptx_path = Path(sys.argv[1])
    if not pptx_path.exists():
        sys.stderr.write(f"file not found: {pptx_path}\n")
        sys.exit(1)

    try:
        with zipfile.ZipFile(pptx_path) as z:
            slides = _ordered_slide_parts(z)
            if not slides:
                sys.stderr.write(f"no slides in {pptx_path}; not a parseable PPTX.\n")
                sys.exit(1)
            chunks: list[str] = []
            any_text = False
            for n, part in slides:
                fragments = _slide_text(z, part)
                if fragments:
                    any_text = True
                chunks.append(f"=== Slide {n} ===")
                chunks.extend(fragments)
            if not any_text:
                sys.stderr.write(f"every slide in {pptx_path} is empty.\n")
                sys.exit(1)
            sys.stdout.write("\n".join(chunks))
    except zipfile.BadZipFile:
        sys.stderr.write(f"not a valid PPTX (zip parse failure): {pptx_path}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
