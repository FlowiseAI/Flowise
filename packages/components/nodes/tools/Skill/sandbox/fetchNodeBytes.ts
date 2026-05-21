/**
 * Skill — raw-bytes loader for sandbox materialization.
 *
 * Companion to [`fetchNodeSource`](../fetchNodeSource.ts). Where that
 * module deals exclusively with text source of *code* nodes, this one
 * handles every kind the sandbox needs on disk:
 *
 *   - `skill`: the compiled markdown lives inside the bundle entry's
 *     `content` field — callers pass it via the `inlineContent` option
 *     and we never touch storage.
 *   - `code` / `data`: payload is `nodes/{nodeId}.json` with a `content`
 *     string (UTF-8). We encode it back to a Buffer.
 *   - `binary`: payload is `nodes/{nodeId}.bin` with raw bytes.
 *
 * Results are cached by `(workspaceId, skillId, nodeId, digest)` exactly
 * like `fetchNodeSource`. A re-publish mints a fresh digest so stale
 * entries age out without manual invalidation.
 */

import { SkillKind } from '../utils'
import { readBlobFromStorage } from '../../../../src/storageUtils'

interface CacheEntry {
    bytes: Buffer
    expiresAt: number
}

const TTL_MS = 60 * 60 * 1000
const MAX_ENTRIES = 256
const memoryCache = new Map<string, CacheEntry>()
const SKILLS_ROOT = 'skills'

const cacheKey = (workspaceId: string, skillId: string, nodeId: string, digest: string): string =>
    `${workspaceId}:${skillId}:${nodeId}:${digest}`

const evictIfNeeded = (): void => {
    while (memoryCache.size > MAX_ENTRIES) {
        const firstKey = memoryCache.keys().next().value as string | undefined
        if (!firstKey) break
        memoryCache.delete(firstKey)
    }
}

export interface FetchNodeBytesInput {
    workspaceId: string
    skillId: string
    nodeId: string
    kind: SkillKind
    /** Optional digest for cache keying. Falls back to an uncached read. */
    digest?: string
    /**
     * Already-resolved content (e.g. `bundle.entries[nodeId].content` for
     * `skill` kinds). When provided we skip storage entirely.
     */
    inlineContent?: string
}

/**
 * Fetch the on-disk bytes for a skill asset. Returns `null` when the
 * payload is missing, malformed, or the kind is unsupported so callers
 * can emit a clean "source not found" envelope instead of crashing.
 */
export const fetchNodeBytes = async (input: FetchNodeBytesInput): Promise<Buffer | null> => {
    const { workspaceId, skillId, nodeId, kind, digest, inlineContent } = input

    if (typeof inlineContent === 'string') {
        return Buffer.from(inlineContent, 'utf8')
    }

    const key = digest ? cacheKey(workspaceId, skillId, nodeId, digest) : null
    if (key) {
        const cached = memoryCache.get(key)
        if (cached && cached.expiresAt > Date.now()) {
            // LRU touch.
            memoryCache.delete(key)
            memoryCache.set(key, cached)
            return cached.bytes
        }
        if (cached) memoryCache.delete(key)
    }

    let bytes: Buffer | null = null
    if (kind === 'binary') {
        bytes = await readBinaryNode(workspaceId, skillId, nodeId)
    } else if (kind === 'skill' || kind === 'code' || kind === 'data') {
        bytes = await readJsonNode(workspaceId, skillId, nodeId)
    } else {
        return null
    }

    if (bytes === null) return null
    if (key) {
        memoryCache.set(key, { bytes, expiresAt: Date.now() + TTL_MS })
        evictIfNeeded()
    }
    return bytes
}

// ---------------------------------------------------------------------------
// Per-kind readers — isolated so tests can stub them and so a future
// storage change (e.g. streaming) only touches one function.
// ---------------------------------------------------------------------------

const readJsonNode = async (workspaceId: string, skillId: string, nodeId: string): Promise<Buffer | null> => {
    // `readBlobFromStorage` returns `null` on a real not-found and throws on
    // every other error. We let real errors propagate so callers see them
    // instead of misclassifying a transient cloud outage as "source missing".
    const buf = await readBlobFromStorage(SKILLS_ROOT, workspaceId, skillId, 'nodes', `${nodeId}.json`)
    if (!buf) return null
    try {
        const payload = JSON.parse(buf.toString('utf8')) as { content?: unknown }
        if (payload && typeof payload.content === 'string') {
            return Buffer.from(payload.content, 'utf8')
        }
    } catch {
        return null
    }
    return null
}

const readBinaryNode = async (workspaceId: string, skillId: string, nodeId: string): Promise<Buffer | null> => {
    return readBlobFromStorage(SKILLS_ROOT, workspaceId, skillId, 'nodes', `${nodeId}.bin`)
}

/** Used by tests; safe to ignore in production. */
export const clearNodeBytesCache = (): void => {
    memoryCache.clear()
}
