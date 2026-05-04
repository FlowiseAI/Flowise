/**
 * Skill — per-file family recipe registry.
 *
 * Skill authors typically write natural-language prose that points at a
 * file ("Execute the scripts at ./scoring-algorithm.js", "Job description
 * at ./job-description.txt") rather than the literal shell command the
 * LLM has to issue. The model is supposed to infer "…so run `node` on
 * it" or "…so `cat` it", but that inference step is flaky under pressure
 * — and even when the model picks `cat`, it ends up streaming the entire
 * file when a targeted `grep` / `head` / `jq` would have done the job
 * for a fraction of the tokens.
 *
 * This module centralises that inference into a small registry keyed on
 * file extension. For each *family* (a coarser bucket than extension —
 * `data-json`, `binary-pdf`, …) we describe one **primary** command and
 * a curated list of **alternative** tasks tagged by intent (`peek` /
 * `tail` / `search` / `count` / `query` / `info`). The output is consumed
 * in two places:
 *
 *   1. `buildBashToolDescription` — renders a top-level "Suggested
 *      invocations" cheat-sheet for every reachable file plus a per-family
 *      "Productive commands" mini-block teaching the LLM the productive
 *      moves (`grep -nE`, `jq`, `pdfgrep`, `head -n N`, `wc -l`, …).
 *
 *   2. `buildToolHint` (via `renderReferenceRecipes`) — appends an
 *      "Execution helpers" block to each skill-file tool's response. Exec
 *      references emit a single line; data/binary references emit up to
 *      three lines (primary + 1–2 productive alternatives) so the LLM
 *      sees the productive options right next to the prose that
 *      mentioned the file.
 *
 * Design constraints:
 *   - Pure, I/O-free, deterministic: same manifest → same text.
 *   - No attempt to run the command; we only *describe* it. The sandbox
 *     can still reject anything that isn't on PATH (the bash tool's JSON
 *     envelope surfaces "command not found" cleanly so the LLM can pick
 *     the next alternative).
 *   - Extensible: adding a new productive command is a one-liner in the
 *     family's `alternatives` array.
 */

import { BUILTIN_HELPERS } from './builtinHelpers'
import type { SandboxManifest, SandboxManifestEntry } from './SandboxManifest'
import { absolutePath, DEFAULT_HELPERS_DIR } from './SandboxManifest'
import type { SkillBundleEntry, SkillKind } from '../utils'

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

/** The intent tag carried by each task inside a family. */
export type RecipeTaskId = 'exec' | 'read' | 'peek' | 'tail' | 'search' | 'count' | 'query' | 'info'

/**
 * One concrete, render-ready command template inside a family.
 *
 * Template tokens recognised by `formatTaskCommand`:
 *   - `{path}`        → absolute VM path of the materialised file
 *   - `{args}`        → trailing positional argv hint (exec families only;
 *                       substituted with ` <argsHint>`, ` [args...]`, or '')
 *   - `{helpers_dir}` → absolute VM path of the built-in helpers
 *                       directory; defaults to `DEFAULT_HELPERS_DIR`
 *                       when no manifest is supplied at render time.
 *
 * Other placeholders (`<pattern>`, `<query>`, `<inner-path>`) are kept
 * verbatim — the LLM substitutes them when it issues the call.
 */
export interface RecipeTask {
    id: RecipeTaskId
    /** Short human label used in grouped headings and helper bullets. */
    label: string
    /** Command template; see header comment for the supported tokens. */
    template: string
    /** One-line description surfaced in the productive-commands block. */
    description: string
}

/**
 * The full list of file families. Each family is a coarser bucket than
 * an extension — every JSON-like extension maps onto `data-json`, every
 * PDF onto `binary-pdf`, etc.
 */
export type RecipeFamily =
    | 'exec-node'
    | 'exec-python'
    | 'exec-shell'
    | 'exec-ruby'
    | 'data-md'
    | 'data-text'
    | 'data-log'
    | 'data-json'
    | 'data-csv'
    | 'data-tsv'
    | 'data-yaml'
    | 'data-xml'
    | 'data-html'
    | 'binary-pdf'
    | 'binary-docx'
    | 'binary-xlsx'
    | 'binary-pptx'
    | 'binary-archive'
    | 'binary-image'
    | 'binary-other'

/** Family definition: coarse label, the recommended primary task, and alternatives. */
export interface FamilyDef {
    family: RecipeFamily
    /** Human label used in grouped headings ("Markdown skill files", "JSON data", …). */
    label: string
    primary: RecipeTask
    /**
     * Productive commands the LLM should reach for instead of running the
     * primary template on every interaction (grep, head, jq, pdfgrep …).
     * Order matters: rendered top-to-bottom in the bash tool description.
     */
    alternatives: RecipeTask[]
}

// ---------------------------------------------------------------------------
// Backwards-compatibility shapes — older imports refer to `CommandRecipe`
// and the legacy `RecipeFamily` literals (`read-text` / `read-binary`).
// We keep the alias around but every consumer in this package now uses
// `FamilyDef` / `RecipeTask`.
// ---------------------------------------------------------------------------

/** Legacy alias — equivalent to a `RecipeTask`, kept for prior consumers. */
export interface CommandRecipe {
    family: RecipeFamily
    label: string
    template: string
    description: string
}

// ---------------------------------------------------------------------------
// Task primitives
// ---------------------------------------------------------------------------

const execTask = (id: RecipeTaskId, label: string, template: string, description: string): RecipeTask => ({
    id,
    label,
    template,
    description
})

// Reusable productive-command primitives shared across families.
const PEEK_HEAD = (n: number): RecipeTask => ({
    id: 'peek',
    label: `Peek (first ${n} lines)`,
    template: `head -n ${n} {path}`,
    description: `First ${n} lines — cheap probe before \`cat\`.`
})

const PEEK_TAIL = (n: number): RecipeTask => ({
    id: 'tail',
    label: `Tail (last ${n} lines)`,
    template: `tail -n ${n} {path}`,
    description: `Last ${n} lines — useful for logs and trailing summaries.`
})

const SEARCH_GREP: RecipeTask = {
    id: 'search',
    label: 'Search',
    template: "grep -nE '<pattern>' {path}",
    description: 'Locate a regex pattern with line numbers; replace `<pattern>` before issuing.'
}

const COUNT_LINES: RecipeTask = {
    id: 'count',
    label: 'Count lines',
    template: 'wc -l {path}',
    description: 'Line count — use to size a file before reading it whole.'
}

const COUNT_BYTES: RecipeTask = {
    id: 'count',
    label: 'Count bytes',
    template: 'wc -c {path}',
    description: 'Byte count — use to size a file before reading it whole.'
}

// ---------------------------------------------------------------------------
// Family registry
// ---------------------------------------------------------------------------

const EXEC_NODE: FamilyDef = {
    family: 'exec-node',
    label: 'Execute with Node.js',
    primary: execTask('exec', 'Execute with Node.js', 'node {path}{args}', 'Runs the file under `node` (v20). Accepts positional argv.'),
    alternatives: []
}

const EXEC_PYTHON: FamilyDef = {
    family: 'exec-python',
    label: 'Execute with Python 3',
    primary: execTask('exec', 'Execute with Python 3', 'python3 {path}{args}', 'Runs the file under `python3`. Accepts positional argv.'),
    alternatives: []
}

const EXEC_SHELL: FamilyDef = {
    family: 'exec-shell',
    label: 'Execute with bash',
    primary: execTask('exec', 'Execute with bash', 'bash {path}{args}', 'Runs the file under `bash`. Accepts positional argv.'),
    alternatives: []
}

const EXEC_RUBY: FamilyDef = {
    family: 'exec-ruby',
    label: 'Execute with Ruby',
    primary: execTask('exec', 'Execute with Ruby', 'ruby {path}{args}', 'Runs the file under `ruby`. Accepts positional argv.'),
    alternatives: []
}

// Reusable "read full" task — kept once so every family that demotes
// `cat` to an alternative shares the same canonical entry.
const READ_FULL_CAT: RecipeTask = {
    id: 'read',
    label: 'Read full',
    template: 'cat {path}',
    description: 'Streams the entire file to stdout — escalate here only after a peek/search proves you need the whole content.'
}

const DATA_MD: FamilyDef = {
    family: 'data-md',
    label: 'Markdown skill files',
    // The skill markdown is already inlined in the SkillFileTool's
    // response, so reaching for `cat` is almost always wasted tokens.
    // Default to a peek; the LLM can escalate to `cat` via the alt.
    primary: PEEK_HEAD(80),
    alternatives: [SEARCH_GREP, READ_FULL_CAT]
}

const DATA_TEXT: FamilyDef = {
    family: 'data-text',
    label: 'Plain text data',
    primary: PEEK_HEAD(50),
    alternatives: [SEARCH_GREP, READ_FULL_CAT, COUNT_LINES]
}

const DATA_LOG: FamilyDef = {
    family: 'data-log',
    label: 'Log files',
    primary: PEEK_TAIL(50),
    alternatives: [SEARCH_GREP, COUNT_LINES, PEEK_HEAD(50)]
}

const DATA_JSON: FamilyDef = {
    family: 'data-json',
    label: 'JSON data',
    // `head -c 2048` is a safer default than `head -n N` for JSON: it
    // works for both pretty-printed and minified documents and reveals
    // enough of the top-level structure for the LLM to plan a `jq` query.
    primary: {
        id: 'peek',
        label: 'Peek (first 2 KB)',
        template: 'head -c 2048 {path}',
        description: 'First 2 KB of the document — enough to see the top-level keys without parsing the whole file.'
    },
    alternatives: [
        {
            id: 'query',
            label: 'jq query',
            template: "jq '<query>' {path}",
            description: 'Run a `jq` expression (e.g. `.candidates | length`) instead of cat-ing the whole document.'
        },
        SEARCH_GREP,
        READ_FULL_CAT,
        COUNT_BYTES
    ]
}

const DATA_CSV: FamilyDef = {
    family: 'data-csv',
    label: 'CSV data',
    primary: {
        id: 'peek',
        label: 'Peek (first 20 rows, columnised)',
        template: 'head -n 20 {path} | column -t -s,',
        description: 'Show the first 20 rows as an aligned table for quick schema discovery.'
    },
    alternatives: [
        {
            id: 'search',
            label: 'awk search',
            template: "awk -F',' '/<pattern>/ {print NR\": \"$0}' {path}",
            description: 'Print rows whose any field matches `<pattern>` with the row number — replace `<pattern>` before issuing.'
        },
        COUNT_LINES,
        READ_FULL_CAT
    ]
}

const DATA_TSV: FamilyDef = {
    family: 'data-tsv',
    label: 'TSV data',
    primary: {
        id: 'peek',
        label: 'Peek (first 20 rows, columnised)',
        template: 'head -n 20 {path} | column -t',
        description: 'Show the first 20 rows as an aligned table for quick schema discovery.'
    },
    alternatives: [SEARCH_GREP, COUNT_LINES, READ_FULL_CAT]
}

const DATA_YAML: FamilyDef = {
    family: 'data-yaml',
    label: 'YAML data',
    primary: PEEK_HEAD(80),
    alternatives: [
        {
            id: 'query',
            label: 'yq query',
            template: "yq '<query>' {path}",
            description: 'Run a `yq` expression instead of cat-ing the whole document. Falls back to `python3 -c` if `yq` is missing.'
        },
        SEARCH_GREP,
        READ_FULL_CAT
    ]
}

const DATA_XML: FamilyDef = {
    family: 'data-xml',
    label: 'XML data',
    primary: PEEK_HEAD(80),
    alternatives: [
        SEARCH_GREP,
        {
            id: 'query',
            label: 'XPath query',
            template: "xmllint --xpath '<query>' {path}",
            description: 'Evaluate an XPath expression — replace `<query>` (e.g. `//book[1]/title/text()`).'
        },
        READ_FULL_CAT
    ]
}

const DATA_HTML: FamilyDef = {
    family: 'data-html',
    label: 'HTML data',
    primary: PEEK_HEAD(80),
    alternatives: [SEARCH_GREP, READ_FULL_CAT]
}

const DATA_HTML_WITH_HELPER: FamilyDef = {
    family: 'data-html',
    label: 'HTML data',
    primary: {
        id: 'read',
        label: 'Strip to plain text (built-in helper)',
        template: 'python3 {helpers_dir}/html_to_text.py {path}',
        description: 'Stdlib-only HTML→text converter that ships with the runtime — drops `<script>`/`<style>`, collapses whitespace.'
    },
    alternatives: [SEARCH_GREP, PEEK_HEAD(80), READ_FULL_CAT]
}

const BINARY_PDF: FamilyDef = {
    family: 'binary-pdf',
    label: 'PDF documents',
    primary: {
        id: 'read',
        label: 'Extract text',
        template: 'pdftotext -layout {path} -',
        description: 'Extract the PDF text to stdout (preserves layout). Pipe through `head` if the document is long.'
    },
    alternatives: [
        {
            id: 'search',
            label: 'PDF search',
            template: "pdfgrep -n '<pattern>' {path}",
            description: 'Search inside the PDF without extracting the whole document; replace `<pattern>` before issuing.'
        },
        {
            id: 'info',
            label: 'PDF metadata',
            template: 'pdfinfo {path}',
            description: 'Page count, title, author and other PDF metadata.'
        }
    ]
}

/**
 * Helper-promoted variant of `binary-pdf` — used when the runtime has
 * materialised the built-in helper bundle into the sandbox. The
 * stdlib-only extractor (`pdf_extract.py`) becomes the primary command
 * because it works on every E2B image, while the native binaries
 * (`pdftotext`, `pdfgrep`) stay reachable as alternatives so the LLM
 * can escalate when the helper output looks garbled.
 */
const BINARY_PDF_WITH_HELPER: FamilyDef = {
    family: 'binary-pdf',
    label: 'PDF documents',
    primary: {
        id: 'read',
        label: 'Extract text (built-in helper)',
        template: 'python3 {helpers_dir}/pdf_extract.py {path}',
        description:
            'Stdlib-only PDF text extractor that ships with the runtime — works on every sandbox image. Falls back to `pdftotext` (see alternatives) for complex layouts the helper cannot handle.'
    },
    alternatives: [
        {
            id: 'read',
            label: 'Extract text (native)',
            template: 'pdftotext -layout {path} -',
            description:
                'Use poppler-utils when the built-in helper returns empty / garbled output — handles columns, fonts, and complex layouts.'
        },
        {
            id: 'search',
            label: 'PDF search',
            template: "pdfgrep -n '<pattern>' {path}",
            description: 'Search inside the PDF without extracting the whole document; replace `<pattern>` before issuing.'
        },
        {
            id: 'info',
            label: 'PDF metadata',
            template: 'pdfinfo {path}',
            description: 'Page count, title, author and other PDF metadata.'
        }
    ]
}

const BINARY_ARCHIVE: FamilyDef = {
    family: 'binary-archive',
    label: 'Archives (zip / jar / whl / …)',
    primary: {
        id: 'info',
        label: 'List contents',
        template: 'unzip -l {path}',
        description: 'List archive members without extracting (works for any zip-shaped archive).'
    },
    alternatives: [
        {
            id: 'info',
            label: 'Identify type',
            template: 'file {path}',
            description: 'Confirm the archive flavour before unpacking.'
        },
        {
            id: 'peek',
            label: 'Peek inner file',
            template: 'unzip -p {path} <inner-path> | head -c 4096',
            description: 'Stream the first 4 KB of an inner file — replace `<inner-path>` with one of the entries from `unzip -l`.'
        }
    ]
}

// Office Open XML families — own their own bucket so we can route the
// helper-promoted variant cleanly. The legacy primary is still
// `unzip -l` (the same as the legacy archive treatment), with
// `unzip -p` available as an escape hatch.

const BINARY_DOCX: FamilyDef = {
    family: 'binary-docx',
    label: 'Word documents (.docx)',
    primary: {
        id: 'info',
        label: 'List archive contents',
        template: 'unzip -l {path}',
        description: 'List the DOCX zip members; without a parser, this is the cheapest first move.'
    },
    alternatives: [
        {
            id: 'peek',
            label: 'Peek body XML',
            template: 'unzip -p {path} word/document.xml | head -c 4096',
            description: 'Stream the first 4 KB of the body XML — readable when the document has no styling soup.'
        },
        {
            id: 'info',
            label: 'Identify type',
            template: 'file {path}',
            description: 'Confirm the file is a real Office Open XML container.'
        }
    ]
}

const BINARY_DOCX_WITH_HELPER: FamilyDef = {
    family: 'binary-docx',
    label: 'Word documents (.docx)',
    primary: {
        id: 'read',
        label: 'Extract text (built-in helper)',
        template: 'python3 {helpers_dir}/docx_extract.py {path}',
        description:
            'Stdlib-only DOCX paragraph extractor that ships with the runtime — works on every sandbox image. Falls back to `pandoc` or `unzip -p` for fidelity.'
    },
    alternatives: [
        {
            id: 'info',
            label: 'List archive contents',
            template: 'unzip -l {path}',
            description: 'Inspect the DOCX zip layout when the helper output is incomplete.'
        },
        {
            id: 'peek',
            label: 'Peek body XML',
            template: 'unzip -p {path} word/document.xml | head -c 4096',
            description: 'Stream the first 4 KB of the body XML for a closer look at structure.'
        }
    ]
}

const BINARY_XLSX: FamilyDef = {
    family: 'binary-xlsx',
    label: 'Excel workbooks (.xlsx)',
    primary: {
        id: 'info',
        label: 'List archive contents',
        template: 'unzip -l {path}',
        description: 'List the XLSX zip members; without a parser, this is the cheapest first move.'
    },
    alternatives: [
        {
            id: 'peek',
            label: 'Peek shared strings',
            template: 'unzip -p {path} xl/sharedStrings.xml | head -c 4096',
            description: 'Most cell text lives here — peeking it is the cheapest fallback.'
        },
        {
            id: 'info',
            label: 'Identify type',
            template: 'file {path}',
            description: 'Confirm the file is a real Office Open XML container.'
        }
    ]
}

const BINARY_XLSX_WITH_HELPER: FamilyDef = {
    family: 'binary-xlsx',
    label: 'Excel workbooks (.xlsx)',
    primary: {
        id: 'read',
        label: 'Extract rows (built-in helper)',
        template: 'python3 {helpers_dir}/xlsx_extract.py {path}',
        description:
            'Stdlib-only XLSX rows extractor that ships with the runtime — emits TSV with `=== Sheet: <name> ===` headers when the workbook has multiple sheets.'
    },
    alternatives: [
        {
            id: 'info',
            label: 'List archive contents',
            template: 'unzip -l {path}',
            description: 'Inspect the XLSX zip layout when the helper output is incomplete.'
        },
        {
            id: 'peek',
            label: 'Peek shared strings',
            template: 'unzip -p {path} xl/sharedStrings.xml | head -c 4096',
            description: 'Useful when the helper returns empty — confirms the workbook actually has string content.'
        }
    ]
}

const BINARY_PPTX: FamilyDef = {
    family: 'binary-pptx',
    label: 'PowerPoint decks (.pptx)',
    primary: {
        id: 'info',
        label: 'List archive contents',
        template: 'unzip -l {path}',
        description: 'List the PPTX zip members; without a parser, this is the cheapest first move.'
    },
    alternatives: [
        {
            id: 'peek',
            label: 'Peek first slide',
            template: 'unzip -p {path} ppt/slides/slide1.xml | head -c 4096',
            description: 'Stream the first 4 KB of slide 1 to see the deck shape.'
        },
        {
            id: 'info',
            label: 'Identify type',
            template: 'file {path}',
            description: 'Confirm the file is a real Office Open XML container.'
        }
    ]
}

const BINARY_PPTX_WITH_HELPER: FamilyDef = {
    family: 'binary-pptx',
    label: 'PowerPoint decks (.pptx)',
    primary: {
        id: 'read',
        label: 'Extract slide text (built-in helper)',
        template: 'python3 {helpers_dir}/pptx_extract.py {path}',
        description: 'Stdlib-only PPTX text extractor that ships with the runtime — emits `=== Slide N ===` separators between slides.'
    },
    alternatives: [
        {
            id: 'info',
            label: 'List archive contents',
            template: 'unzip -l {path}',
            description: 'Inspect the PPTX zip layout when the helper output is incomplete.'
        },
        {
            id: 'peek',
            label: 'Peek first slide',
            template: 'unzip -p {path} ppt/slides/slide1.xml | head -c 4096',
            description: 'Stream the first 4 KB of slide 1 for a closer look at structure.'
        }
    ]
}

const BINARY_IMAGE: FamilyDef = {
    family: 'binary-image',
    label: 'Image files',
    primary: {
        id: 'info',
        label: 'Identify type',
        template: 'file {path}',
        description: 'Print the image format / dimensions metadata via libmagic.'
    },
    alternatives: [
        {
            id: 'info',
            label: 'ImageMagick identify',
            template: 'identify {path}',
            description: 'More detailed format/colourspace info when ImageMagick is installed.'
        },
        {
            id: 'peek',
            label: 'Base64 head',
            template: 'base64 -w0 {path} | head -c 200',
            description: 'First 200 base64 chars — useful for surfacing a tiny preview to the model.'
        }
    ]
}

const BINARY_OTHER: FamilyDef = {
    family: 'binary-other',
    label: 'Binary blobs',
    primary: {
        id: 'info',
        label: 'Identify type',
        template: 'file {path}',
        description: 'Start with `file` to learn the format before picking a decoder.'
    },
    alternatives: [
        {
            id: 'peek',
            label: 'Hex preview',
            template: 'head -c 4096 {path} | xxd | head -n 32',
            description: 'First 4 KB rendered as hex+ASCII — useful for unknown binaries.'
        },
        {
            id: 'info',
            label: 'File stats',
            template: 'stat {path}',
            description: 'Size, permissions, timestamps.'
        }
    ]
}

const FAMILIES: Record<RecipeFamily, FamilyDef> = {
    'exec-node': EXEC_NODE,
    'exec-python': EXEC_PYTHON,
    'exec-shell': EXEC_SHELL,
    'exec-ruby': EXEC_RUBY,
    'data-md': DATA_MD,
    'data-text': DATA_TEXT,
    'data-log': DATA_LOG,
    'data-json': DATA_JSON,
    'data-csv': DATA_CSV,
    'data-tsv': DATA_TSV,
    'data-yaml': DATA_YAML,
    'data-xml': DATA_XML,
    'data-html': DATA_HTML,
    'binary-pdf': BINARY_PDF,
    'binary-docx': BINARY_DOCX,
    'binary-xlsx': BINARY_XLSX,
    'binary-pptx': BINARY_PPTX,
    'binary-archive': BINARY_ARCHIVE,
    'binary-image': BINARY_IMAGE,
    'binary-other': BINARY_OTHER
}

/**
 * Helper-promoted overrides — applied only when `helpersAvailable=true`
 * is passed to `recipeForEntry` / `groupByRecipeFamily`. Families that
 * have no built-in helper today are intentionally absent from this map
 * so we fall through to the legacy `FAMILIES` entry.
 */
const HELPER_FAMILIES: Partial<Record<RecipeFamily, FamilyDef>> = {
    'binary-pdf': BINARY_PDF_WITH_HELPER,
    'binary-docx': BINARY_DOCX_WITH_HELPER,
    'binary-xlsx': BINARY_XLSX_WITH_HELPER,
    'binary-pptx': BINARY_PPTX_WITH_HELPER,
    'data-html': DATA_HTML_WITH_HELPER
}

/**
 * Stable rendering order: exec families first (loudest signal), then
 * data families ordered roughly by how often the LLM hits them in
 * practice (markdown / text / log / json before csv / tsv / yaml / xml /
 * html), then binary families.
 */
export const RECIPE_ORDER: RecipeFamily[] = [
    'exec-node',
    'exec-python',
    'exec-shell',
    'exec-ruby',
    'data-md',
    'data-text',
    'data-log',
    'data-json',
    'data-csv',
    'data-tsv',
    'data-yaml',
    'data-xml',
    'data-html',
    'binary-pdf',
    'binary-docx',
    'binary-xlsx',
    'binary-pptx',
    'binary-archive',
    'binary-image',
    'binary-other'
]

const BY_EXT: Record<string, RecipeFamily> = {
    js: 'exec-node',
    mjs: 'exec-node',
    cjs: 'exec-node',

    py: 'exec-python',

    sh: 'exec-shell',
    bash: 'exec-shell',

    rb: 'exec-ruby',

    md: 'data-md',
    markdown: 'data-md',

    txt: 'data-text',

    log: 'data-log',

    json: 'data-json',

    csv: 'data-csv',
    tsv: 'data-tsv',

    yaml: 'data-yaml',
    yml: 'data-yaml',

    xml: 'data-xml',

    html: 'data-html',
    htm: 'data-html',

    pdf: 'binary-pdf',

    docx: 'binary-docx',
    xlsx: 'binary-xlsx',
    pptx: 'binary-pptx',

    zip: 'binary-archive',
    jar: 'binary-archive',
    whl: 'binary-archive',

    png: 'binary-image',
    jpg: 'binary-image',
    jpeg: 'binary-image',
    gif: 'binary-image',
    webp: 'binary-image',
    bmp: 'binary-image',
    svg: 'binary-image'
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface RecipeSelectionOptions {
    /**
     * Whether the runtime has materialised the built-in helper bundle
     * into the current session. When `true`, families with a helper
     * variant in `HELPER_FAMILIES` return the helper-promoted version
     * (helper template as primary, native binaries demoted to
     * alternatives). When `false` / omitted, the legacy native-binary
     * variant is returned — keeping callers that don't pass the flag
     * fully backwards compatible.
     */
    helpersAvailable?: boolean
}

/**
 * Return the family definition for a manifest entry.
 *
 * Resolution order:
 *   1. Exact extension match against `BY_EXT`.
 *   2. `SkillKind` fallback: `code` → exec-node (a reasonable default
 *      for the author to correct), `data` → data-text, `skill` →
 *      data-md, `binary` → binary-other.
 *
 * When `opts.helpersAvailable` is true, families that ship a built-in
 * helper variant (see `HELPER_FAMILIES`) return the helper-promoted
 * definition instead. Other families are unaffected.
 */
export const recipeForEntry = (entry: SandboxManifestEntry, opts?: RecipeSelectionOptions): FamilyDef => {
    const fam = BY_EXT[entry.extension]
    if (fam) {
        if (opts?.helpersAvailable) {
            const helped = HELPER_FAMILIES[fam]
            if (helped) return helped
        }
        return FAMILIES[fam]
    }
    return fallbackForKind(entry.kind)
}

const fallbackForKind = (kind: SkillKind): FamilyDef => {
    switch (kind) {
        case 'code':
            return EXEC_NODE
        case 'skill':
            return DATA_MD
        case 'data':
            return DATA_TEXT
        case 'binary':
        default:
            return BINARY_OTHER
    }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Render `task.template` into a concrete shell command string. When
 * `argsHint` is provided (e.g. `'<candidate-resume> <job-description>'`)
 * it is substituted for the `{args}` placeholder with a leading space;
 * otherwise the placeholder is dropped. Exec tasks without an
 * `argsHint` get a generic ` [args...]` so the LLM remembers it *can*
 * pass arguments.
 *
 * `helpersDir` overrides the `{helpers_dir}` token (defaults to
 * `DEFAULT_HELPERS_DIR`). Templates without the token are unaffected,
 * so existing callers don't need to be updated.
 */
export const formatTaskCommand = (task: RecipeTask, absPath: string, argsHint?: string, helpersDir?: string): string => {
    const acceptsArgs = task.id === 'exec'
    const args = argsHint ? ` ${argsHint}` : acceptsArgs ? ' [args...]' : ''
    return task.template
        .replace('{path}', absPath)
        .replace('{args}', args)
        .replace('{helpers_dir}', helpersDir ?? DEFAULT_HELPERS_DIR)
}

/**
 * Backwards-compatibility shim — older callers reach for this helper
 * with a `CommandRecipe` argument. We accept either a recipe-shaped
 * object (legacy) or a `RecipeTask` (new); both share the `template`
 * field which is the only thing the renderer actually needs.
 */
export const formatRecipeCommand = (
    recipe: CommandRecipe | RecipeTask,
    absPath: string,
    argsHint?: string,
    helpersDir?: string
): string => {
    const acceptsArgs = recipe.template.includes('{args}')
    const args = argsHint ? ` ${argsHint}` : acceptsArgs ? ' [args...]' : ''
    return recipe.template
        .replace('{path}', absPath)
        .replace('{args}', args)
        .replace('{helpers_dir}', helpersDir ?? DEFAULT_HELPERS_DIR)
}

/**
 * Group manifest entries by their family. Preserves the insertion order
 * defined by `RECIPE_ORDER` so rendering is stable between runs.
 *
 * Pass `{ helpersAvailable: true }` to route helper-eligible families
 * (see `HELPER_FAMILIES`) to their helper-promoted definitions. Other
 * families are unaffected.
 */
export const groupByRecipeFamily = (
    entries: readonly SandboxManifestEntry[],
    opts?: RecipeSelectionOptions
): Array<{ family: RecipeFamily; def: FamilyDef; entries: SandboxManifestEntry[] }> => {
    const buckets = new Map<RecipeFamily, { def: FamilyDef; entries: SandboxManifestEntry[] }>()
    for (const entry of entries) {
        const def = recipeForEntry(entry, opts)
        const bucket = buckets.get(def.family) ?? { def, entries: [] }
        bucket.entries.push(entry)
        buckets.set(def.family, bucket)
    }
    return RECIPE_ORDER.filter((fam) => buckets.has(fam)).map((fam) => ({
        family: fam,
        def: buckets.get(fam)!.def,
        entries: buckets.get(fam)!.entries
    }))
}

// ---------------------------------------------------------------------------
// Per-skill helper block
// ---------------------------------------------------------------------------

/**
 * For one skill bundle entry, walk its `files.references` and render
 * human-readable recipe lines for each reachable file, addressed via
 * the concrete bash tool name so the LLM can copy-paste the JSON call.
 *
 * Output shape (one block per reference):
 *   - exec families         → 1 line  (the primary `node`/`python3`/… command)
 *   - data / binary families → 1–3 lines (primary + up to 2 productive
 *                              alternatives, capped to keep the appended
 *                              tool hint bounded)
 *
 * Returns an empty array when the skill has no materialised references;
 * the caller can then skip injecting the helper section entirely.
 */
export const renderReferenceRecipes = (
    entry: SkillBundleEntry,
    manifest: SandboxManifest,
    nodeIdIndex: Map<string, SandboxManifestEntry>,
    bashToolName: string
): string[] => {
    const refs = (entry.files?.references ?? []) as Array<{ nodeId?: string }>
    if (!refs.length) return []

    const helpersAvailable = manifest.helpers.length > 0

    const seen = new Set<string>()
    const lines: string[] = []
    for (const ref of refs) {
        if (!ref || typeof ref.nodeId !== 'string') continue
        if (seen.has(ref.nodeId)) continue
        seen.add(ref.nodeId)

        const target = nodeIdIndex.get(ref.nodeId)
        if (!target) continue

        const def = recipeForEntry(target, { helpersAvailable })
        const abs = absolutePath(manifest, target)

        // Primary command — always emitted.
        const primaryCmd = formatTaskCommand(def.primary, abs, undefined, manifest.helpersDir)
        lines.push(`- ./${target.relPath} — ${def.primary.label.toLowerCase()}: call \`${bashToolName}\` with {"command": "${primaryCmd}"}`)

        // Productive alternatives — only for non-exec families. Capped at
        // two so the appended hint stays well under the per-tool budget.
        if (def.primary.id !== 'exec') {
            const productive = pickProductiveAlternatives(def, MAX_PRODUCTIVE_PER_REF)
            for (const task of productive) {
                const cmd = formatTaskCommand(task, abs, undefined, manifest.helpersDir)
                lines.push(`    · ${task.label.toLowerCase()}: \`${cmd}\``)
            }
        }
    }
    return lines
}

// ---------------------------------------------------------------------------
// Built-in helper rendering — feeds the dedicated section in
// `buildBashToolDescription`.
// ---------------------------------------------------------------------------

/**
 * Render the human-readable cheat-sheet that appears in the bash tool
 * description as the "Built-in helpers" section. Each line is a single
 * concrete invocation the LLM can copy verbatim.
 *
 * Lines are emitted in `BUILTIN_HELPERS` registry order so the order
 * stays deterministic. Returns an empty array when the manifest has no
 * helpers — the caller can then skip the section entirely.
 */
export const renderHelperCatalog = (manifest: SandboxManifest): string[] => {
    if (!manifest.helpers.length) return []
    const lines: string[] = []
    for (const meta of manifest.helpers) {
        const registered = BUILTIN_HELPERS.find((h) => h.name === meta.name)
        const description = registered?.description ?? '(no description)'
        const cmd = `python3 ${manifest.helpersDir}/${meta.relPath} <path>`
        lines.push(`- ${meta.relPath.padEnd(20)} ${cmd}    # ${description}`)
    }
    return lines
}

/** Cap on per-reference productive alternatives in the helper block. */
const MAX_PRODUCTIVE_PER_REF = 2

/**
 * Pick up to `n` alternatives biased toward the highest-leverage moves
 * for token-efficiency. The order is `search`/`query` first (locate the
 * data without re-reading the file), then `peek`/`tail` (probe more of
 * the file), then `read` (full `cat` — explicit escalation path), then
 * `info`/`count` (metadata), then `exec`.
 *
 * `read` is deliberately surfaced before `info`/`count` so the LLM
 * always sees the escalation route on the per-skill helper block, even
 * with the `MAX_PRODUCTIVE_PER_REF=2` cap.
 */
const pickProductiveAlternatives = (def: FamilyDef, n: number): RecipeTask[] => {
    if (n <= 0 || !def.alternatives.length) return []
    const sorted = [...def.alternatives].sort((a, b) => priority(a.id) - priority(b.id))
    return sorted.slice(0, n)
}

const priority = (id: RecipeTaskId): number => {
    switch (id) {
        case 'search':
            return 0
        case 'query':
            return 1
        case 'peek':
            return 2
        case 'tail':
            return 3
        case 'read':
            return 4
        case 'info':
            return 5
        case 'count':
            return 6
        case 'exec':
            return 7
    }
}
