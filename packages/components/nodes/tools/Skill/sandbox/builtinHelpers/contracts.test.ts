/**
 * Contract tests — execute every helper script under a real `python3`
 * against a synthetic fixture and assert the captured stdout / stderr /
 * exit code match the contract documented in this module's README.
 *
 * The fixtures are built inline (no checked-in binaries) so the tests
 * are reproducible without external generators. When `python3` is not
 * on PATH (e.g. a Windows dev box without Python), the suite skips with
 * a clear message instead of failing.
 */

import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as zlib from 'node:zlib'
import { BUILTIN_HELPERS } from './index'

// ---------------------------------------------------------------------------
// Python availability gate — if `python3 --version` doesn't return 0 we
// skip the whole suite with a console warning so a missing interpreter on
// a dev box never fails CI runs from other engineers' branches.
// ---------------------------------------------------------------------------

const PYTHON3_AVAILABLE: boolean = (() => {
    try {
        const r = spawnSync('python3', ['--version'], { encoding: 'utf8' })
        return r.status === 0
    } catch {
        return false
    }
})()

const describeIfPython = PYTHON3_AVAILABLE ? describe : describe.skip
if (!PYTHON3_AVAILABLE) {
    // eslint-disable-next-line no-console
    console.warn('[builtinHelpers/contracts.test.ts] python3 not on PATH — skipping helper contract tests.')
}

// ---------------------------------------------------------------------------
// Tiny PDF builder — produces a single-page PDF whose content stream is
// FlateDecode-compressed and contains one `(text) Tj` operator per line.
// That is the exact subset `pdf_extract.py` is built to handle.
// ---------------------------------------------------------------------------

const escapePdfString = (s: string): string => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

const buildSimpleFlateDecodePdf = (lines: string[]): Buffer => {
    const tjOps = lines.map((l, i) => (i === 0 ? `(${escapePdfString(l)}) Tj` : `0 -14 Td (${escapePdfString(l)}) Tj`)).join(' ')
    const contentStream = `BT /F1 12 Tf 100 700 Td ${tjOps} ET`
    const compressed = zlib.deflateSync(Buffer.from(contentStream, 'latin1'))
    const dict = `<< /Length ${compressed.length} /Filter /FlateDecode >>`
    return Buffer.concat([
        Buffer.from('%PDF-1.4\n', 'latin1'),
        Buffer.from(`${dict}\nstream\n`, 'latin1'),
        compressed,
        Buffer.from('\nendstream\n%%EOF\n', 'latin1')
    ])
}

// ---------------------------------------------------------------------------
// Spawn helper — runs `python3 <script> <...args>` and returns the
// captured stdio + exit code. Stays synchronous so tests stay flat.
// ---------------------------------------------------------------------------

interface SpawnedResult {
    stdout: string
    stderr: string
    status: number | null
}

const runScript = (scriptRelPath: string, args: string[]): SpawnedResult => {
    const scriptAbsPath = path.join(__dirname, 'scripts', scriptRelPath)
    const r = spawnSync('python3', [scriptAbsPath, ...args], {
        encoding: 'utf8',
        timeout: 10_000
    })
    return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status }
}

/**
 * Run an inline Python snippet to build a zip-shaped Office Open XML
 * fixture — keeps the helper contract tests free of checked-in
 * binaries while reusing the python3 we already require for the
 * helpers themselves.
 *
 * The snippet receives `OUT_PATH` via `os.environ` so we don't have to
 * shell-escape arbitrary path strings on the command line.
 */
const buildFixtureWithPython = (snippet: string, outPath: string): void => {
    const r = spawnSync('python3', ['-c', snippet], {
        encoding: 'utf8',
        env: { ...process.env, OUT_PATH: outPath },
        timeout: 10_000
    })
    if (r.status !== 0) {
        throw new Error(`fixture builder failed (exit ${r.status}); stderr=${r.stderr}; stdout=${r.stdout}`)
    }
}

// ---------------------------------------------------------------------------
// Per-helper test scaffolding — write a temp dir before the suite, clean
// up after. Every test inside the helper-specific block can drop fixtures
// under `tmpDir` without worrying about collisions.
// ---------------------------------------------------------------------------

let tmpDir: string

beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'builtin-helpers-'))
})

afterAll(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true })
})

// ===========================================================================
// pdf_extract.py
// ===========================================================================

describeIfPython('pdf_extract.py — happy path', () => {
    it('extracts text from a single-page FlateDecode PDF, one line per Tj operator', async () => {
        const fixture = path.join(tmpDir, 'happy.pdf')
        await fs.writeFile(fixture, buildSimpleFlateDecodePdf(['Hello, world', 'Line 2']))

        const r = runScript('pdf_extract.py', [fixture])

        expect(r.status).toBe(0)
        expect(r.stdout).toBe('Hello, world\nLine 2')
        expect(r.stderr).toBe('')
    })

    it('handles PDF strings containing escaped parens and backslashes', async () => {
        // Restrict to latin-1-safe characters: the helper deliberately
        // decodes content streams as latin-1 (see script docstring) and
        // our minimal in-test PDF builder cannot emit a Unicode font
        // dictionary, so anything > 0xFF gets truncated to its low byte
        // and re-emitted as a control char — that's a fixture-builder
        // limit, not a parser limit.
        const fixture = path.join(tmpDir, 'escapes.pdf')
        await fs.writeFile(fixture, buildSimpleFlateDecodePdf(['salary band (L4): $\\150k - $\\200k', 'note: see (appendix A)']))

        const r = runScript('pdf_extract.py', [fixture])

        expect(r.status).toBe(0)
        expect(r.stdout).toBe('salary band (L4): $\\150k - $\\200k\nnote: see (appendix A)')
    })
})

describeIfPython('pdf_extract.py — failure modes', () => {
    it('returns exit 2 with usage message when called with no args', () => {
        const r = runScript('pdf_extract.py', [])
        expect(r.status).toBe(2)
        expect(r.stdout).toBe('')
        expect(r.stderr).toMatch(/usage:\s+pdf_extract\.py/)
    })

    it('returns exit 2 when called with too many args', () => {
        const r = runScript('pdf_extract.py', ['a.pdf', 'b.pdf'])
        expect(r.status).toBe(2)
        expect(r.stderr).toMatch(/usage:\s+pdf_extract\.py/)
    })

    it('returns exit 1 when the file does not exist', () => {
        const r = runScript('pdf_extract.py', [path.join(tmpDir, 'does-not-exist.pdf')])
        expect(r.status).toBe(1)
        expect(r.stderr).toMatch(/file not found/)
    })

    it('returns exit 1 with a "no decodable streams" message for a non-PDF input', async () => {
        const fixture = path.join(tmpDir, 'plain.txt')
        await fs.writeFile(fixture, 'just plain text, no PDF structure here\n')

        const r = runScript('pdf_extract.py', [fixture])

        expect(r.status).toBe(1)
        // Helper hints at the escalation path so the LLM can pick `pdftotext`.
        expect(r.stderr).toMatch(/no decodable text streams/)
        expect(r.stderr).toMatch(/pdftotext/)
    })

    it('returns exit 1 when the FlateDecode stream is corrupt (cannot decompress)', async () => {
        const fixture = path.join(tmpDir, 'corrupt.pdf')
        // Same shape as a real Flate'd PDF but the stream payload is garbage,
        // so zlib.decompress raises and the helper falls through to the
        // "no decodable streams" exit-1 path.
        const garbage = Buffer.from('not actually deflate-compressed bytes', 'latin1')
        const dict = `<< /Length ${garbage.length} /Filter /FlateDecode >>`
        const corrupt = Buffer.concat([
            Buffer.from('%PDF-1.4\n', 'latin1'),
            Buffer.from(`${dict}\nstream\n`, 'latin1'),
            garbage,
            Buffer.from('\nendstream\n%%EOF\n', 'latin1')
        ])
        await fs.writeFile(fixture, corrupt)

        const r = runScript('pdf_extract.py', [fixture])

        expect(r.status).toBe(1)
        expect(r.stderr).toMatch(/no decodable text streams/)
    })
})

// ===========================================================================
// docx_extract.py
// ===========================================================================

const DOCX_BUILDER = `
import os, zipfile
from xml.sax.saxutils import escape

paragraphs = ["Quarterly review", "", "Strong performance from the data team."]

ns_w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
body = "".join(
    f'<w:p><w:r><w:t xml:space="preserve">{escape(p)}</w:t></w:r></w:p>'
    for p in paragraphs
)
document_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    f'<w:document xmlns:w="{ns_w}"><w:body>{body}</w:body></w:document>'
)
content_types = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    '</Types>'
)
rels = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    '</Relationships>'
)
with zipfile.ZipFile(os.environ["OUT_PATH"], 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types)
    z.writestr('_rels/.rels', rels)
    z.writestr('word/document.xml', document_xml)
`

describeIfPython('docx_extract.py — happy path', () => {
    it('extracts paragraph text from a minimal .docx, preserving empty paragraphs', async () => {
        const fixture = path.join(tmpDir, 'memo.docx')
        buildFixtureWithPython(DOCX_BUILDER, fixture)

        const r = runScript('docx_extract.py', [fixture])

        expect(r.status).toBe(0)
        expect(r.stdout).toBe('Quarterly review\n\nStrong performance from the data team.')
        expect(r.stderr).toBe('')
    })
})

describeIfPython('docx_extract.py — failure modes', () => {
    it('returns exit 2 when called with no args', () => {
        const r = runScript('docx_extract.py', [])
        expect(r.status).toBe(2)
        expect(r.stderr).toMatch(/usage:\s+docx_extract\.py/)
    })

    it('returns exit 1 when the file does not exist', () => {
        const r = runScript('docx_extract.py', [path.join(tmpDir, 'nope.docx')])
        expect(r.status).toBe(1)
        expect(r.stderr).toMatch(/file not found/)
    })

    it('returns exit 1 when the file is not a zip', async () => {
        const fixture = path.join(tmpDir, 'plain.docx')
        await fs.writeFile(fixture, 'just plain text')
        const r = runScript('docx_extract.py', [fixture])
        expect(r.status).toBe(1)
        expect(r.stderr).toMatch(/no extractable text/)
    })
})

// ===========================================================================
// xlsx_extract.py
// ===========================================================================

const XLSX_BUILDER = `
import os, zipfile

ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"

content_types = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
    '</Types>'
)
rels = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    '</Relationships>'
)
workbook = (
    f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    f'<workbook xmlns="{ns}"><sheets><sheet name="Roster" sheetId="1" r:id="rId1" '
    f'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></sheets></workbook>'
)
shared_strings = (
    f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    f'<sst xmlns="{ns}" count="3" uniqueCount="3">'
    f'<si><t>name</t></si>'
    f'<si><t>level</t></si>'
    f'<si><t>Alex</t></si>'
    f'</sst>'
)
sheet1 = (
    f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    f'<worksheet xmlns="{ns}"><sheetData>'
    f'<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
    f'<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>4</v></c></row>'
    f'</sheetData></worksheet>'
)
with zipfile.ZipFile(os.environ["OUT_PATH"], 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types)
    z.writestr('_rels/.rels', rels)
    z.writestr('xl/workbook.xml', workbook)
    z.writestr('xl/sharedStrings.xml', shared_strings)
    z.writestr('xl/worksheets/sheet1.xml', sheet1)
`

describeIfPython('xlsx_extract.py — happy path', () => {
    it('emits TSV rows resolving shared-string and inline-numeric cells', async () => {
        const fixture = path.join(tmpDir, 'roster.xlsx')
        buildFixtureWithPython(XLSX_BUILDER, fixture)

        const r = runScript('xlsx_extract.py', [fixture])

        expect(r.status).toBe(0)
        // Single-sheet workbook: no `=== Sheet: ===` header.
        expect(r.stdout).toBe('name\tlevel\nAlex\t4')
    })

    it('honours an explicit 1-based sheet index', async () => {
        const fixture = path.join(tmpDir, 'roster-by-index.xlsx')
        buildFixtureWithPython(XLSX_BUILDER, fixture)

        const r = runScript('xlsx_extract.py', [fixture, '1'])

        expect(r.status).toBe(0)
        expect(r.stdout).toBe('name\tlevel\nAlex\t4')
    })
})

describeIfPython('xlsx_extract.py — failure modes', () => {
    it('returns exit 2 when called with no args', () => {
        const r = runScript('xlsx_extract.py', [])
        expect(r.status).toBe(2)
        expect(r.stderr).toMatch(/usage:\s+xlsx_extract\.py/)
    })

    it('returns exit 2 for a non-integer sheet index', async () => {
        const fixture = path.join(tmpDir, 'roster-bad-idx.xlsx')
        buildFixtureWithPython(XLSX_BUILDER, fixture)
        const r = runScript('xlsx_extract.py', [fixture, 'one'])
        expect(r.status).toBe(2)
        expect(r.stderr).toMatch(/sheet index must be an integer/)
    })

    it('returns exit 1 when the requested sheet index is out of range', async () => {
        const fixture = path.join(tmpDir, 'roster-out-of-range.xlsx')
        buildFixtureWithPython(XLSX_BUILDER, fixture)
        const r = runScript('xlsx_extract.py', [fixture, '99'])
        expect(r.status).toBe(1)
        expect(r.stderr).toMatch(/not found or empty/)
    })

    it('returns exit 1 when the file is not a zip', async () => {
        const fixture = path.join(tmpDir, 'plain.xlsx')
        await fs.writeFile(fixture, 'plain text')
        const r = runScript('xlsx_extract.py', [fixture])
        expect(r.status).toBe(1)
        expect(r.stderr).toMatch(/zip parse failure/)
    })
})

// ===========================================================================
// pptx_extract.py
// ===========================================================================

const PPTX_BUILDER = `
import os, zipfile

a_ns = "http://schemas.openxmlformats.org/drawingml/2006/main"
p_ns = "http://schemas.openxmlformats.org/presentationml/2006/main"

slides = [
    [("title", "Q1 Performance"), ("body", "Hit every milestone.")],
    [("title", "Risks"), ("body", "Hiring is behind plan.")]
]

content_types = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
)
content_types += "".join(
    f'<Override PartName="/ppt/slides/slide{i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
    for i in range(len(slides))
)
content_types += '</Types>'

rels = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>'
    '</Relationships>'
)

def slide_xml(items):
    body = "".join(
        f'<p:sp xmlns:p="{p_ns}"><p:txBody><a:p xmlns:a="{a_ns}"><a:r><a:t>{txt}</a:t></a:r></a:p></p:txBody></p:sp>'
        for _, txt in items
    )
    return (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<p:sld xmlns:p="{p_ns}" xmlns:a="{a_ns}"><p:cSld><p:spTree>{body}</p:spTree></p:cSld></p:sld>'
    )

with zipfile.ZipFile(os.environ["OUT_PATH"], 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types)
    z.writestr('_rels/.rels', rels)
    for i, items in enumerate(slides, start=1):
        z.writestr(f'ppt/slides/slide{i}.xml', slide_xml(items))
`

describeIfPython('pptx_extract.py — happy path', () => {
    it('emits Slide N headers followed by every text fragment in tree order', async () => {
        const fixture = path.join(tmpDir, 'deck.pptx')
        buildFixtureWithPython(PPTX_BUILDER, fixture)

        const r = runScript('pptx_extract.py', [fixture])

        expect(r.status).toBe(0)
        expect(r.stdout).toBe(
            ['=== Slide 1 ===', 'Q1 Performance', 'Hit every milestone.', '=== Slide 2 ===', 'Risks', 'Hiring is behind plan.'].join('\n')
        )
    })
})

describeIfPython('pptx_extract.py — failure modes', () => {
    it('returns exit 2 when called with no args', () => {
        const r = runScript('pptx_extract.py', [])
        expect(r.status).toBe(2)
        expect(r.stderr).toMatch(/usage:\s+pptx_extract\.py/)
    })

    it('returns exit 1 when the file is not a zip', async () => {
        const fixture = path.join(tmpDir, 'plain.pptx')
        await fs.writeFile(fixture, 'plain text')
        const r = runScript('pptx_extract.py', [fixture])
        expect(r.status).toBe(1)
        expect(r.stderr).toMatch(/zip parse failure/)
    })
})

// ===========================================================================
// html_to_text.py
// ===========================================================================

describeIfPython('html_to_text.py — happy path', () => {
    it('strips tags, drops script/style, decodes entities, and collapses whitespace', async () => {
        const fixture = path.join(tmpDir, 'page.html')
        await fs.writeFile(
            fixture,
            [
                '<html>',
                '  <head><title>ignore me</title>',
                '    <style>body { color: red; }</style>',
                '    <script>console.log("ignored")</script>',
                '  </head>',
                '  <body>',
                '    <h1>Welcome</h1>',
                '    <p>This is a <strong>bold</strong> claim &amp; nothing more.</p>',
                '    <ul><li>One</li><li>Two</li></ul>',
                '  </body>',
                '</html>'
            ].join('\n')
        )

        const r = runScript('html_to_text.py', [fixture])

        expect(r.status).toBe(0)
        expect(r.stderr).toBe('')
        const lines = r.stdout.split('\n').filter((l) => l.length > 0)
        expect(lines).toContain('Welcome')
        expect(lines).toContain('This is a bold claim & nothing more.')
        expect(lines).toContain('One')
        expect(lines).toContain('Two')
        // None of the dropped sections should leak.
        expect(r.stdout).not.toContain('color: red')
        expect(r.stdout).not.toContain('console.log')
        expect(r.stdout).not.toContain('ignore me')
    })
})

describeIfPython('html_to_text.py — failure modes', () => {
    it('returns exit 2 when called with no args', () => {
        const r = runScript('html_to_text.py', [])
        expect(r.status).toBe(2)
        expect(r.stderr).toMatch(/usage:\s+html_to_text\.py/)
    })

    it('returns exit 1 when the file does not exist', () => {
        const r = runScript('html_to_text.py', [path.join(tmpDir, 'nope.html')])
        expect(r.status).toBe(1)
        expect(r.stderr).toMatch(/file not found/)
    })

    it('returns exit 1 for an HTML document with only script/style content', async () => {
        const fixture = path.join(tmpDir, 'empty.html')
        await fs.writeFile(fixture, '<html><head><script>1+1</script></head><body></body></html>')
        const r = runScript('html_to_text.py', [fixture])
        expect(r.status).toBe(1)
        expect(r.stderr).toMatch(/no extractable text/)
    })
})

// ---------------------------------------------------------------------------
// Cross-helper invariant — every registered helper script must exist on
// disk where the registry says it does. Catches typos and missing files
// before they reach the gulpfile / runtime.
// ---------------------------------------------------------------------------

describe('every BUILTIN_HELPERS script is reachable on disk', () => {
    for (const helper of BUILTIN_HELPERS) {
        it(`${helper.relPath} resolves to an existing file`, async () => {
            const abs = path.join(__dirname, 'scripts', helper.relPath)
            await expect(fs.stat(abs)).resolves.toBeDefined()
        })
    }
})
