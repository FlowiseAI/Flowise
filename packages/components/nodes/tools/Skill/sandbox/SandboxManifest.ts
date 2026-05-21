/**
 * Skill — Sandbox Manifest.
 *
 * A `SandboxManifest` describes what the E2B VM's filesystem should look
 * like for one agent run. It is a pure, deterministic projection of a
 * published `SkillBundle` + the Skill node's selected file IDs; the
 * bundle itself already carries canonical paths, kinds, and content
 * digests.
 *
 * Responsibilities:
 *   - Compute the *reachable* set from the user's selection (BFS over
 *     `dependencyGraph` plus any explicit file references on skills).
 *   - Project each reachable node into a `SandboxManifestEntry` with a
 *     canonical, skills-dir-relative path.
 *   - Expose the helpers (`computeReachable`, `normalizeBundlePath`)
 *     previously inlined in `Skill.ts` so both the legacy exec path and
 *     the new sandbox path share one source of truth.
 *
 * This module is intentionally I/O-free — it never reads storage. Fetching
 * the bytes for code / data / binary nodes is the `SandboxSession`'s job.
 */

import { BUILTIN_HELPERS, BuiltinHelper, builtinHelpersEnabled } from './builtinHelpers'
import { SkillBundle, SkillBundleEntry, SkillKind } from '../utils'

// ---------------------------------------------------------------------------
// Canonical layout constants — mirror `SANDBOX_INTEGRATION.md` §"What Lives
// on the Sandbox Filesystem".
// ---------------------------------------------------------------------------

/** Root inside the VM where skill files are materialized. */
export const DEFAULT_SKILLS_DIR = '/home/user/skills'
/** Root inside the VM where the LLM is expected to write artefacts. */
export const DEFAULT_OUTPUT_DIR = '/home/user/output'
/** Root inside the VM where the runtime materialises built-in helpers. */
export const DEFAULT_HELPERS_DIR = '/home/user/helpers'

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** Describes a single materializable skill asset. */
export interface SandboxManifestEntry {
    nodeId: string
    /**
     * Canonical path relative to the skills directory, derived from
     * `bundle.entries[nodeId].path` and normalised (no `./`, no leading `/`,
     * no `skills/` prefix). Joined with `skillsDir` at materialization time.
     */
    relPath: string
    kind: SkillKind
    /** Lowercased file extension without the leading dot. */
    extension: string
    /** Human name (entry.name) — used for logs and error envelopes. */
    name: string
    /**
     * Optional — when present, used as the cache key for source/byte reads
     * so a republish invalidates stale caches automatically.
     */
    digest?: string
}

/**
 * One built-in helper script the runtime materialises into the sandbox
 * before the LLM gets its first turn. Carries enough metadata for
 * `SandboxSession` to upload the bytes and for downstream callers (the
 * bash tool description, recipe selection) to render references.
 *
 * Distinct from `SandboxManifestEntry` because helpers:
 *   - are first-party trusted code, exempt from the per-file / per-session
 *     upload budgets that protect against malicious skill assets;
 *   - live under their own `helpersDir`, never under `skillsDir`, so
 *     name collisions with author files are impossible;
 *   - are not part of the bundle's `dependencyGraph`.
 */
export interface SandboxHelperEntry {
    name: string
    /** Path relative to the helpers directory (e.g. `pdf_extract.py`). */
    relPath: string
    /** sha256 of the script bytes; useful for cache keys + drift detection. */
    digest: string
    /** Decoded byte length — surfaced through telemetry. */
    sizeBytes: number
}

export interface SandboxManifest {
    /** Absolute VM path for the skills root. */
    skillsDir: string
    /** Absolute VM path where LLM-produced files are harvested from. */
    outputDir: string
    /**
     * Absolute VM path where built-in helpers live. Always set so that
     * downstream code can render helper command templates uniformly,
     * even when no helpers are materialised in the current session.
     */
    helpersDir: string
    /** Ordered list of materializable entries (skill + code + data + binary). */
    entries: SandboxManifestEntry[]
    /**
     * Built-in helpers materialised under `helpersDir`. Empty when the
     * `SKILL_BUILTIN_HELPERS` env switch is off, when `includeHelpers`
     * is explicitly disabled, or when the registry is empty.
     */
    helpers: SandboxHelperEntry[]
}

// ---------------------------------------------------------------------------
// Path + reachability helpers (lifted from Skill.ts / SkillExecTool.ts so
// both the bash and exec_skill_code flows stay consistent)
// ---------------------------------------------------------------------------

/**
 * Normalise an entry path to the canonical skills-dir-relative form.
 *
 * Strips `./`, leading `/`, and a `skills/` prefix; collapses `\\` and `//`.
 * Matches the behaviour of the original helper in `Skill.ts`.
 */
export const normalizeBundlePath = (p: string | undefined): string => {
    if (!p) return ''
    let s = p.trim().replace(/\\/g, '/').replace(/\/+/g, '/')
    if (s.startsWith('./')) s = s.slice(2)
    if (s.startsWith('/')) s = s.slice(1)
    if (s.startsWith('skills/')) s = s.slice('skills/'.length)
    return s
}

/**
 * BFS over `bundle.dependencyGraph` plus each entry's explicit file
 * references. The returned set is the complete list of node ids the
 * caller is allowed to materialize or execute against.
 */
export const computeReachable = (roots: string[], bundle: SkillBundle): Set<string> => {
    const reachable = new Set<string>()
    const graph = bundle.dependencyGraph || {}
    const stack = [...roots]
    while (stack.length) {
        const id = stack.pop() as string
        if (reachable.has(id)) continue
        reachable.add(id)
        const deps = graph[id] || []
        for (const d of deps) if (!reachable.has(d)) stack.push(d)
        // Walk explicit file references — some bundles omit these from
        // `dependencyGraph` (e.g. if the compiler split file vs skill edges).
        const entry = bundle.entries?.[id]
        if (entry) {
            const fileRefs = (entry.files?.references || []) as Array<{ nodeId?: string }>
            for (const r of fileRefs) if (r && typeof r.nodeId === 'string' && !reachable.has(r.nodeId)) stack.push(r.nodeId)
        }
    }
    return reachable
}

// ---------------------------------------------------------------------------
// Manifest builder
// ---------------------------------------------------------------------------

export interface BuildManifestOptions {
    skillsDir?: string
    outputDir?: string
    helpersDir?: string
    /**
     * When present, filter entries to only the listed kinds. Defaults to
     * all four kinds so the sandbox sees the same view the author authored.
     */
    kinds?: SkillKind[]
    /**
     * Whether to project the built-in helper registry into the manifest's
     * `helpers` field. Defaults to `builtinHelpersEnabled(process.env)` so
     * the global `SKILL_BUILTIN_HELPERS` switch governs production runs.
     * Tests pass an explicit boolean to keep the projection deterministic.
     */
    includeHelpers?: boolean
    /**
     * Optional override for the helper registry — used by tests to inject
     * a stub set without going through the global registry. Production
     * always uses `BUILTIN_HELPERS` from `./builtinHelpers`.
     */
    helperRegistry?: readonly BuiltinHelper[]
}

/**
 * Project a `SkillBundle` + caller-selected skill IDs into a
 * `SandboxManifest` ready for materialization.
 *
 * Contract:
 *   - Empty `selectedIds` → empty manifest (session caller should skip VM
 *     startup entirely).
 *   - Entries missing a `path` are dropped with a silent skip; the bundle
 *     compiler guarantees non-md nodes carry a path, but we defend against
 *     malformed bundles.
 *   - Duplicate relPaths are de-duplicated, last-write-wins by bundle
 *     order; this should be impossible in practice but keeps the VM
 *     layout deterministic if an author renames a file mid-publish.
 */
export const buildManifest = (bundle: SkillBundle, selectedIds: string[], options?: BuildManifestOptions): SandboxManifest => {
    const skillsDir = options?.skillsDir ?? DEFAULT_SKILLS_DIR
    const outputDir = options?.outputDir ?? DEFAULT_OUTPUT_DIR
    const helpersDir = options?.helpersDir ?? DEFAULT_HELPERS_DIR
    const allowedKinds = new Set<SkillKind>(options?.kinds ?? ['skill', 'code', 'data', 'binary'])
    const includeHelpers = options?.includeHelpers ?? builtinHelpersEnabled()
    const helperRegistry = options?.helperRegistry ?? BUILTIN_HELPERS

    // Helpers are independent of `selectedIds` — they ship with the
    // runtime, not with the user's bundle — so we project them eagerly
    // and only short-circuit the entries projection when nothing is
    // selected.
    const helpers = includeHelpers
        ? helperRegistry.map<SandboxHelperEntry>((h) => ({
              name: h.name,
              relPath: h.relPath,
              // `digest` and `sizeBytes` are filled in by `SandboxSession`
              // once the bytes are loaded. Surfacing placeholders here
              // would invite stale cache hits, so we leave them empty
              // and rely on the session to enrich the manifest in place.
              digest: '',
              sizeBytes: 0
          }))
        : []

    if (!selectedIds?.length) {
        return { skillsDir, outputDir, helpersDir, entries: [], helpers }
    }

    const reachable = computeReachable(selectedIds, bundle)
    const byPath = new Map<string, SandboxManifestEntry>()

    for (const nodeId of reachable) {
        const entry: SkillBundleEntry | undefined = bundle.entries?.[nodeId]
        if (!entry) continue
        if (!allowedKinds.has(entry.kind)) continue

        const relPath = normalizeBundlePath(entry.path)
        if (!relPath) continue

        const extension = extractExtension(relPath, entry.name)

        byPath.set(relPath, {
            nodeId,
            relPath,
            kind: entry.kind,
            extension,
            name: entry.name,
            digest: entry.source?.contentDigest
        })
    }

    // Stable ordering makes logs and the LLM-facing tree hint deterministic.
    const entries = Array.from(byPath.values()).sort((a, b) => a.relPath.localeCompare(b.relPath))
    return { skillsDir, outputDir, helpersDir, entries, helpers }
}

// ---------------------------------------------------------------------------
// Lookup helpers — used by the bash-tool description and by callers that
// need to map LLM-supplied paths back to a nodeId.
// ---------------------------------------------------------------------------

/**
 * Build a `relPath → entry` index. The key is the normalised path so
 * downstream lookup can be as forgiving as the legacy path resolver.
 */
export const indexManifestByPath = (manifest: SandboxManifest): Map<string, SandboxManifestEntry> => {
    const out = new Map<string, SandboxManifestEntry>()
    for (const e of manifest.entries) out.set(e.relPath, e)
    return out
}

/**
 * Build a `nodeId → entry` index. Skills carry their file references as
 * `{ source, nodeId }` pairs (see `packages/server/.../entities.ts#FileReference`),
 * so this is the natural lookup when projecting per-skill reference
 * lists into materialised manifest entries.
 */
export const indexManifestByNodeId = (manifest: SandboxManifest): Map<string, SandboxManifestEntry> => {
    const out = new Map<string, SandboxManifestEntry>()
    for (const e of manifest.entries) out.set(e.nodeId, e)
    return out
}

/** Convenience: absolute VM path for a manifest entry. */
export const absolutePath = (manifest: SandboxManifest, entry: SandboxManifestEntry): string => joinPosix(manifest.skillsDir, entry.relPath)

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const extractExtension = (relPath: string, fallbackName: string): string => {
    const pick = (s: string): string => {
        const i = s.lastIndexOf('.')
        return i < 0 || i === s.length - 1 ? '' : s.slice(i + 1).toLowerCase()
    }
    return pick(relPath) || pick(fallbackName)
}

/**
 * Minimal POSIX `path.join` — we avoid importing `node:path` here so this
 * file stays trivially tree-shakeable and avoids Windows-path surprises.
 *
 * Exported so the sandbox session can share the exact same join semantics
 * when materialising helpers under `helpersDir`.
 */
export const joinPosix = (a: string, b: string): string => {
    if (!a) return b
    if (!b) return a
    const left = a.endsWith('/') ? a.slice(0, -1) : a
    const right = b.startsWith('/') ? b.slice(1) : b
    return `${left}/${right}`
}
