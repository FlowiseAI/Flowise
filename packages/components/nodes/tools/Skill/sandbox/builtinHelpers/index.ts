/**
 * Skill — built-in sandbox helpers.
 *
 * A tiny registry of stdlib-only Python scripts that the runtime
 * materialises into every Skill sandbox VM under a dedicated helpers
 * directory (default `/home/user/helpers`). They give the LLM a
 * predictable, image-independent way to handle common file formats
 * (PDF, DOCX, XLSX, PPTX, HTML) without the skill author having to
 * ship their own extractor in every workspace.
 *
 * Design constraints:
 *   - **Stdlib-only Python** — works on any E2B base image that ships
 *     `python3`, no `pip install` step required.
 *   - **Trusted bytes** — helpers are not counted against the per-file
 *     or per-session upload budgets that protect against malicious
 *     skill assets. They ARE accounted for in the per-session telemetry
 *     log so we can spot accidental size growth.
 *   - **Fail-soft contract** — every helper exits 0 on success, 1 on a
 *     parser failure, 2 on bad usage. The LLM is taught to escalate to
 *     a native binary (e.g. `pdftotext` for PDF) via the alternatives
 *     surfaced by `commandRecipes.ts` whenever a helper returns 1.
 *   - **Immutable per process** — `bytes()` and `digest` are memoised;
 *     calling them repeatedly across sessions is cheap.
 *
 * Opt-out: set `SKILL_BUILTIN_HELPERS=false` (or `0` / `off` / `no`)
 * to skip materialisation entirely. Recipes will then fall back to the
 * native commands they were built around (pdftotext, unzip, …).
 */

import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

/**
 * One registered helper script. The `bytes()` accessor reads the
 * checked-in `.py` file from disk on first call and caches the buffer
 * + sha256 for the lifetime of the process.
 */
export interface BuiltinHelper {
    /** Stable identifier used in logs and recipe templates (e.g. `pdf_extract`). */
    name: string
    /** Path relative to the sandbox `helpersDir` (e.g. `pdf_extract.py`). */
    relPath: string
    /** One-line description surfaced in the bash tool's "Built-in helpers" block. */
    description: string
    /** Extensions (lowercased, no leading dot) whose recipe family routes to this helper. */
    handles: { extension: string }[]
    /** Lazily-loaded script bytes; safe to call repeatedly. */
    bytes(): Promise<Buffer>
    /**
     * sha256 digest of the script bytes. Computed lazily alongside the
     * first `bytes()` call; subsequent reads are O(1). Surfaced through
     * the manifest so a future caching layer can detect helper drift.
     */
    digest(): Promise<string>
    /** Decoded byte length, available after the first `bytes()` call. */
    sizeBytes(): Promise<number>
}

// ---------------------------------------------------------------------------
// Internal helper factory — keeps `bytes()` / `digest()` / `sizeBytes()`
// in lockstep so the three accessors always reflect the same on-disk
// payload even if the script is hot-edited during a long-running test.
// ---------------------------------------------------------------------------

const SCRIPTS_DIR = path.join(__dirname, 'scripts')

interface HelperSpec {
    name: string
    description: string
    handles: { extension: string }[]
}

const makeHelper = (spec: HelperSpec): BuiltinHelper => {
    const relPath = `${spec.name}.py`
    const absPath = path.join(SCRIPTS_DIR, relPath)

    let cached: { bytes: Buffer; digest: string } | null = null
    const load = async (): Promise<{ bytes: Buffer; digest: string }> => {
        if (cached) return cached
        const buf = await fs.readFile(absPath)
        const digest = createHash('sha256').update(buf).digest('hex')
        cached = { bytes: buf, digest }
        return cached
    }

    return {
        name: spec.name,
        relPath,
        description: spec.description,
        handles: spec.handles,
        bytes: async () => (await load()).bytes,
        digest: async () => (await load()).digest,
        sizeBytes: async () => (await load()).bytes.length
    }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Ordered list of built-in helpers. Order matters for the bash tool's
 * description rendering — keep PDF first since it's the highest-leverage
 * helper (the one that motivated this whole module).
 *
 * To add a new helper:
 *   1. Drop a stdlib-only `<name>.py` into `./scripts/` following the
 *      contract documented in this module's header.
 *   2. Append a `makeHelper({ ... })` entry below.
 *   3. Wire its `extension`(s) into `commandRecipes.ts` so the bash
 *      recipes route to it when `helpersAvailable` is true.
 *   4. Add a fixture + contract test under `./contracts.test.ts`.
 */
export const BUILTIN_HELPERS: readonly BuiltinHelper[] = [
    makeHelper({
        name: 'pdf_extract',
        description: 'Extract text from PDF (stdlib only — single-page FlateDecode PDFs).',
        handles: [{ extension: 'pdf' }]
    }),
    makeHelper({
        name: 'docx_extract',
        description: 'Extract paragraph text from a .docx (stdlib only — body paragraphs).',
        handles: [{ extension: 'docx' }]
    }),
    makeHelper({
        name: 'xlsx_extract',
        description: 'Extract rows from a .xlsx as TSV; multi-sheet workbooks get headers (stdlib only).',
        handles: [{ extension: 'xlsx' }]
    }),
    makeHelper({
        name: 'pptx_extract',
        description: 'Extract slide text from a .pptx with `=== Slide N ===` separators (stdlib only).',
        handles: [{ extension: 'pptx' }]
    }),
    makeHelper({
        name: 'html_to_text',
        description: 'Strip HTML to plain text; `<script>`/`<style>` are dropped, whitespace collapsed (stdlib only).',
        handles: [{ extension: 'html' }, { extension: 'htm' }]
    })
]

// ---------------------------------------------------------------------------
// Env opt-out
// ---------------------------------------------------------------------------

const parseBool = (v: string | undefined, fallback: boolean): boolean => {
    if (v === undefined || v === null) return fallback
    const t = String(v).trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(t)) return true
    if (['0', 'false', 'no', 'off'].includes(t)) return false
    return fallback
}

/**
 * Should the runtime materialise the built-in helpers into every
 * sandbox session? Defaults to `true`; flip with `SKILL_BUILTIN_HELPERS=false`
 * (or `0` / `off` / `no`).
 */
export const builtinHelpersEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => parseBool(env.SKILL_BUILTIN_HELPERS, true)

// ---------------------------------------------------------------------------
// Telemetry helper
// ---------------------------------------------------------------------------

/**
 * Sum the on-disk footprint of a list of helpers — used by `SandboxSession`
 * to log a single line per session ("Materialized N helpers (B bytes)") so
 * accidental size growth is visible without bisecting commits.
 */
export const helpersFootprint = async (helpers: readonly BuiltinHelper[]): Promise<{ count: number; bytes: number }> => {
    let bytes = 0
    for (const h of helpers) bytes += await h.sizeBytes()
    return { count: helpers.length, bytes }
}
