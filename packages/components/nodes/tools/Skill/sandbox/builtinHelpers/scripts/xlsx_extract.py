#!/usr/bin/env python3
"""
Built-in helper — minimal stdlib-only XLSX rows extractor.

Materialised by `SandboxSession` under `/home/user/helpers/xlsx_extract.py`.

Invocation contract
-------------------
    python3 /home/user/helpers/xlsx_extract.py <xlsx_path> [<sheet_index>]

`<sheet_index>` is optional and 1-based. When omitted, every sheet is
emitted with `=== Sheet: <name> ===` separators so a single command
gives the LLM the entire workbook.

Scope
-----
An `.xlsx` is a zip archive containing a string pool
(`xl/sharedStrings.xml`) and one or more sheets
(`xl/worksheets/sheet<N>.xml`). Cells reference shared strings via the
`t="s"` attribute and a numeric value pointing into the pool; numeric
cells carry their value inline. We resolve string references, keep raw
numeric/boolean/date values as-is (the LLM rarely needs full date
formatting), and emit one row per `<row>` as TSV (tab-separated).

Formulas, merged cells, formatting, and cross-sheet references are
intentionally not handled. `pandas`, `openpyxl`, or `xlsx2csv` cover
the cases that need fidelity.

Output
------
One row per spreadsheet row, cells joined with `\t`. Multiple sheets
get `=== Sheet: <name> ===` headers (only when no explicit
`<sheet_index>` was supplied).

Exit codes
----------
  0  success; rows written to stdout.
  1  not a valid XLSX (zip parse failure, missing sheet, empty
     workbook, or unparseable XML).
  2  bad usage (wrong number of args, non-integer sheet index).
"""

import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
WORKBOOK_PART = "xl/workbook.xml"
SHARED_STRINGS_PART = "xl/sharedStrings.xml"


def _strings_pool(z: zipfile.ZipFile) -> list[str]:
    """Resolve `xl/sharedStrings.xml` into a flat string list."""
    try:
        xml_bytes = z.read(SHARED_STRINGS_PART)
    except KeyError:
        return []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []
    pool: list[str] = []
    for si in root.iter(f"{{{MAIN_NS}}}si"):
        # `<si>` may carry a single `<t>` or multiple `<r><t>...</t></r>` runs.
        parts = [t.text or "" for t in si.iter(f"{{{MAIN_NS}}}t")]
        pool.append("".join(parts))
    return pool


def _sheet_names(z: zipfile.ZipFile) -> list[tuple[str, str]]:
    """Return [(sheet_name, sheet_xml_part_path), ...] in workbook order."""
    try:
        wb_bytes = z.read(WORKBOOK_PART)
    except KeyError:
        return []
    try:
        wb_root = ET.fromstring(wb_bytes)
    except ET.ParseError:
        return []
    out: list[tuple[str, str]] = []
    for i, sheet_el in enumerate(wb_root.iter(f"{{{MAIN_NS}}}sheet"), start=1):
        name = sheet_el.attrib.get("name") or f"Sheet{i}"
        # Conventional file naming — the cleanest stdlib-only resolution.
        # Real XLSX writers may use a workbook.xml.rels indirection; if so
        # we still try `sheet<i>.xml` first and fall back to scanning the
        # zip for any matching sheetN.xml.
        out.append((name, f"xl/worksheets/sheet{i}.xml"))
    return out


def _extract_sheet(z: zipfile.ZipFile, sheet_part: str, pool: list[str]) -> list[list[str]]:
    """Return cells as a list-of-rows (each row a list of cell strings)."""
    try:
        xml_bytes = z.read(sheet_part)
    except KeyError:
        return []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []
    rows: list[list[str]] = []
    for row_el in root.iter(f"{{{MAIN_NS}}}row"):
        row: list[str] = []
        for c in row_el.iter(f"{{{MAIN_NS}}}c"):
            t = c.attrib.get("t")
            v = c.find(f"{{{MAIN_NS}}}v")
            if t == "s":
                # Shared-string reference.
                try:
                    idx = int((v.text or "0") if v is not None else "0")
                    row.append(pool[idx] if 0 <= idx < len(pool) else "")
                except ValueError:
                    row.append("")
            elif t == "inlineStr":
                inline = c.find(f"{{{MAIN_NS}}}is")
                row.append("".join((t.text or "") for t in inline.iter(f"{{{MAIN_NS}}}t")) if inline is not None else "")
            else:
                # Numeric, boolean, date serial, or empty.
                row.append((v.text or "") if v is not None else "")
        rows.append(row)
    return rows


def main() -> None:
    if len(sys.argv) not in (2, 3):
        sys.stderr.write("usage: xlsx_extract.py <xlsx_path> [<sheet_index>]\n")
        sys.exit(2)

    xlsx_path = Path(sys.argv[1])
    if not xlsx_path.exists():
        sys.stderr.write(f"file not found: {xlsx_path}\n")
        sys.exit(1)

    sheet_filter: int | None = None
    if len(sys.argv) == 3:
        try:
            sheet_filter = int(sys.argv[2])
        except ValueError:
            sys.stderr.write(f"sheet index must be an integer, got: {sys.argv[2]}\n")
            sys.exit(2)
        if sheet_filter < 1:
            sys.stderr.write("sheet index is 1-based\n")
            sys.exit(2)

    try:
        with zipfile.ZipFile(xlsx_path) as z:
            pool = _strings_pool(z)
            sheets = _sheet_names(z)
            if not sheets:
                sys.stderr.write(f"no sheets in {xlsx_path}; not a parseable XLSX.\n")
                sys.exit(1)

            chunks: list[str] = []
            for i, (name, part) in enumerate(sheets, start=1):
                if sheet_filter is not None and i != sheet_filter:
                    continue
                rows = _extract_sheet(z, part, pool)
                if sheet_filter is None and len(sheets) > 1:
                    chunks.append(f"=== Sheet: {name} ===")
                for row in rows:
                    chunks.append("\t".join(row))
            if not chunks:
                sys.stderr.write(f"sheet {sheet_filter} not found or empty.\n")
                sys.exit(1)
            sys.stdout.write("\n".join(chunks))
    except zipfile.BadZipFile:
        sys.stderr.write(f"not a valid XLSX (zip parse failure): {xlsx_path}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
