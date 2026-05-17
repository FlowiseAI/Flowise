/**
 * Skill sandbox — artifact resolver (Layer 4 → chat-upload bridge).
 *
 * The agent's `processSandboxLinks` step copies LLM-written files out
 * of `/home/user/output/` and into chat-scoped storage so the rewritten
 * `sandbox:/...` markdown link resolves to a downloadable URL.
 *
 * This module is the security boundary for that copy:
 *
 *   - `resolveSandboxUriToOutputDir` enforces "the URI must point at a
 *     file inside *this skill's* outputDir, with no `..` traversal and
 *     no sibling-directory prefix overlap." Anything else returns null
 *     and the agent falls through to the next resolver (or the
 *     URL-only legacy rewrite).
 *
 *   - `buildSkillSandboxArtifactResolver` wires that clamp to a
 *     `SandboxFileTransfer` so the agent can fetch the bytes lazily.
 *
 *   - `registerSandboxArtifactResolver` mutates the per-execution
 *     `ICommonObject` so every active skill node contributes its own
 *     resolver to a shared registry the agent iterates over.
 *
 * Why a separate file? `Skill.ts` ends with
 * `module.exports = { nodeClass: Skill_Tools }` (Flowise's node
 * registration pattern). That CommonJS write clobbers any named ES
 * `export` declared earlier in the same module, so helpers we want to
 * test directly need to live somewhere with a normal ES-only export
 * surface — exactly this file.
 */

import path from 'path'
import { ICommonObject } from '../../../../src/Interface'
import { SandboxFileTransfer, SkillSandboxArtifact, SkillSandboxArtifactResolver } from '../../../../src/sandbox'

// ---------------------------------------------------------------------------
// Byte budget
// ---------------------------------------------------------------------------

/** Hard cap on individual artifact size. Overridable via SKILL_MAX_ARTIFACT_BYTES. */
export const DEFAULT_MAX_ARTIFACT_BYTES = 10 * 1024 * 1024 // 10 MB
/** Absolute ceiling even when the env var asks for more — keeps chat storage bounded. */
export const HARD_MAX_ARTIFACT_BYTES = 100 * 1024 * 1024 // 100 MB

/**
 * Parse the SKILL_MAX_ARTIFACT_BYTES env var with sensible fallbacks.
 * Returns the default on missing / non-numeric / non-positive input,
 * and clamps oversized values to `HARD_MAX_ARTIFACT_BYTES`.
 */
export const parseArtifactByteLimit = (raw: string | undefined): number => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_ARTIFACT_BYTES
    return Math.min(parsed, HARD_MAX_ARTIFACT_BYTES)
}

// ---------------------------------------------------------------------------
// MIME inference
// ---------------------------------------------------------------------------

/**
 * Tiny extension → MIME map covering the artifact types skills typically
 * hand back to the user. Falls back to `application/octet-stream` so the
 * download API never refuses a file outright; the browser's own sniffing
 * takes over from there.
 */
export const ARTIFACT_MIME_BY_EXT: Record<string, string> = {
    md: 'text/markdown',
    markdown: 'text/markdown',
    txt: 'text/plain',
    log: 'text/plain',
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
    json: 'application/json',
    yaml: 'application/yaml',
    yml: 'application/yaml',
    xml: 'application/xml',
    html: 'text/html',
    htm: 'text/html',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    zip: 'application/zip'
}

export const guessArtifactMime = (fileName: string): string => {
    const ext = (fileName.split('.').pop() || '').toLowerCase()
    return ARTIFACT_MIME_BY_EXT[ext] || 'application/octet-stream'
}

// ---------------------------------------------------------------------------
// URI clamp
// ---------------------------------------------------------------------------

/** Pathological URI ceiling — keeps the backend's argv buffer bounded. */
const MAX_URI_TAIL_LENGTH = 512

/**
 * Parse a `sandbox:/<absolute-path>` URI and clamp the result to
 * `outputDir`. Returns null on any malformed input, path traversal
 * attempt, or out-of-scope target.
 *
 * Security contract (every branch is exercised by `Skill.test.ts`):
 *   - The URI scheme must be exactly `sandbox:/` (one or more leading
 *     slashes are collapsed to a single one). Other schemes / relative
 *     paths / non-strings are rejected.
 *   - After POSIX normalisation, the absolute path must be inside
 *     `outputDir` *with the trailing slash included* — `..` segments
 *     cannot escape it, and sibling directories like
 *     `/home/user/output_extra/` are never resolvable.
 *   - Paths longer than `MAX_URI_TAIL_LENGTH` beyond the outputDir
 *     prefix are rejected to keep the backend's argv buffer bounded.
 */
export const resolveSandboxUriToOutputDir = (sandboxUri: string, outputDir: string): string | null => {
    if (typeof sandboxUri !== 'string' || !sandboxUri.startsWith('sandbox:/')) return null
    // Strip the scheme. The rest is treated as an absolute POSIX path.
    let raw = sandboxUri.slice('sandbox:'.length)
    // Collapse `sandbox://x/y` and `sandbox:/x/y` to the same shape: one leading slash.
    raw = '/' + raw.replace(/^\/+/, '')
    // POSIX-normalise to fold any `.` / `..` segments. After this step,
    // the path can no longer contain `..` if it stays absolute.
    const normalized = path.posix.normalize(raw)
    if (!normalized.startsWith('/') || normalized.includes('..')) return null
    // Clamp to outputDir. The trailing-slash check prevents matches
    // against sibling directories like `/home/user/output_extra/`.
    const root = outputDir.replace(/\/+$/, '') + '/'
    if (!normalized.startsWith(root)) return null
    if (normalized.length > root.length + MAX_URI_TAIL_LENGTH) return null
    return normalized
}

// ---------------------------------------------------------------------------
// Resolver factory & registration
// ---------------------------------------------------------------------------

/**
 * Build a `SkillSandboxArtifactResolver` for a single sandbox session.
 * The resolver:
 *   1. Validates the URI against this skill's outputDir.
 *   2. Downloads the bytes via the supplied `SandboxFileTransfer`.
 *   3. Enforces the per-artifact byte cap.
 *   4. Returns `null` (never throws) on any failure so the agent can
 *      fall through to the next resolver.
 *
 * The `backend` argument is typically a materializing proxy returned by
 * `SandboxSession.getBackend()`, so the first call boots the sandbox
 * if needed and subsequent calls reuse the live session.
 */
export const buildSkillSandboxArtifactResolver = (
    id: string,
    backend: SandboxFileTransfer,
    outputDir: string
): SkillSandboxArtifactResolver => ({
    id,
    async resolveArtifact(sandboxUri: string): Promise<SkillSandboxArtifact | null> {
        const abs = resolveSandboxUriToOutputDir(sandboxUri, outputDir)
        if (!abs) return null
        try {
            const responses = await backend.downloadFiles([abs])
            const resp = responses?.[0]
            if (!resp || resp.error || !resp.content) return null
            const bytes = resp.content
            const limit = parseArtifactByteLimit(process.env.SKILL_MAX_ARTIFACT_BYTES)
            if (bytes.byteLength > limit) return null
            const fileName = path.posix.basename(abs)
            return { bytes, fileName, mime: guessArtifactMime(fileName) }
        } catch {
            // Backend failures are non-fatal — the agent falls back to
            // the next resolver (or the existing URL-only rewrite).
            return null
        }
    }
})

/**
 * Append a resolver to the per-execution registry on `options`. Safe to
 * call from multiple Skill nodes during the same agent run; each
 * resolver only owns paths inside its own outputDir, so the registry
 * order doesn't affect correctness.
 */
export const registerSandboxArtifactResolver = (options: ICommonObject, resolver: SkillSandboxArtifactResolver): void => {
    const existing = Array.isArray(options.skillSandboxArtifactResolvers)
        ? (options.skillSandboxArtifactResolvers as SkillSandboxArtifactResolver[])
        : []
    options.skillSandboxArtifactResolvers = [...existing, resolver]
}
