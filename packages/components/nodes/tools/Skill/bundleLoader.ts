import { readBlobFromStorage } from '../../../src/storageUtils'
import { SkillBundle } from './utils'

/**
 * Process-local cache of published SkillBundles. Flowise's canvas re-runs
 * `init()` on every debug invocation, so even a tiny cache drops dozens of
 * storage reads per session. Size is capped to avoid unbounded growth on
 * long-running workers.
 */

interface CacheEntry {
    bundle: SkillBundle
    expiresAt: number
}

const TTL_MS = 24 * 60 * 60 * 1000
const MAX_ENTRIES = 64
const SKILLS_ROOT = 'skills'

const memoryCache = new Map<string, CacheEntry>()

const cacheKey = (workspaceId: string, skillId: string, bundleId: string): string => `${workspaceId}:${skillId}:${bundleId}`

const evictIfNeeded = (): void => {
    while (memoryCache.size > MAX_ENTRIES) {
        const firstKey = memoryCache.keys().next().value as string | undefined
        if (!firstKey) break
        memoryCache.delete(firstKey)
    }
}

/**
 * Load a published `SkillBundle` by its deterministic id. Reads the JSON
 * artifact written by `SkillStorage.putBundle` on publish.
 *
 * Throws when the bundle file is missing so callers can surface a clear
 * "republish the skill" error.
 */
export const loadPublishedBundle = async (workspaceId: string, skillId: string, bundleId: string): Promise<SkillBundle> => {
    const key = cacheKey(workspaceId, skillId, bundleId)
    const cached = memoryCache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
        memoryCache.delete(key)
        memoryCache.set(key, cached)
        return cached.bundle
    }
    if (cached) memoryCache.delete(key)

    // `readBlobFromStorage` returns `null` only on a real not-found and
    // re-throws every other error (network/IAM/throttling). Distinguishing
    // these lets us surface a clean "republish" message for missing bundles
    // and propagate transient cloud failures verbatim.
    const buf = await readBlobFromStorage(SKILLS_ROOT, workspaceId, skillId, 'artifacts', bundleId, 'bundle.json')
    if (!buf) {
        throw new Error(`Published bundle not found in storage — republish the skill`)
    }

    let parsed: SkillBundle
    try {
        parsed = JSON.parse(buf.toString('utf8')) as SkillBundle
    } catch (err) {
        throw new Error(`Published bundle is corrupt — republish the skill (${(err as Error).message})`)
    }

    memoryCache.set(key, { bundle: parsed, expiresAt: Date.now() + TTL_MS })
    evictIfNeeded()
    return parsed
}

/** Used by tests; safe to ignore in production. */
export const clearBundleCache = (): void => {
    memoryCache.clear()
}
