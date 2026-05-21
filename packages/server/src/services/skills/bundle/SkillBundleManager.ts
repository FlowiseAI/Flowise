import { Keyv } from 'keyv'
import KeyvRedis from '@keyv/redis'
import { Cache, createCache } from 'cache-manager'
import { SkillBundle } from '../entities'
import * as SkillStorage from '../SkillStorage'

/**
 * Multi-tier cache for compiled `SkillBundle`s.
 *
 *   L1  in-process memory (always)        — Keyv default in-memory store
 *   L2  Redis (optional)                  — Keyv + KeyvRedis, when REDIS_URL or
 *                                           REDIS_HOST is set
 *   L3  object storage (source of truth)  — `SkillStorage.{get,put}Bundle`
 *
 * Cache keys: `${workspaceId}:${skillId}:${bundleId}`. Because `bundleId` is
 * content-addressed and immutable for any published bundle, cache reads keyed
 * on `row.publishedBundleId` are always self-consistent across replicas — a
 * new publish mints a fresh bundleId that misses the cache by definition.
 *
 * The L2 (Redis) tier is enabled purely on the presence of Redis env vars,
 * independent of `MODE=QUEUE`, so any HA deployment with a shared Redis can
 * benefit. If Redis init fails, the manager falls back to memory-only and
 * logs a warning rather than crashing the server — this cache is on the
 * skill admin path, not the runtime hot path.
 */

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000
const REDIS_NAMESPACE = 'skillBundle'

let cache: Cache | null = null

const parseKeepAlive = (): number | undefined => {
    const v = process.env.REDIS_KEEP_ALIVE
    return v && !isNaN(parseInt(v, 10)) ? parseInt(v, 10) : undefined
}

const isRedisConfigured = (): boolean => Boolean(process.env.REDIS_URL || process.env.REDIS_HOST)

const buildRedisConfig = (): Record<string, any> => {
    const keepAlive = parseKeepAlive()
    if (process.env.REDIS_URL) {
        return {
            url: process.env.REDIS_URL,
            socket: {
                keepAlive
            },
            pingInterval: keepAlive
        }
    }
    return {
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            tls: process.env.REDIS_TLS === 'true',
            cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
            key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
            ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined,
            keepAlive
        },
        pingInterval: keepAlive
    }
}

const initCache = (): Cache => {
    if (cache) return cache

    const stores: Keyv[] = [new Keyv({ ttl: DEFAULT_TTL_MS })]

    if (isRedisConfigured()) {
        try {
            stores.push(
                new Keyv({
                    store: new KeyvRedis(buildRedisConfig()),
                    namespace: REDIS_NAMESPACE,
                    ttl: DEFAULT_TTL_MS
                })
            )
        } catch (err) {
            console.warn('[SkillBundleManager] Redis init failed, using in-memory cache only:', (err as Error).message)
        }
    }

    cache = createCache({ stores })
    return cache
}

const makeKey = (workspaceId: string, skillId: string, bundleId: string): string => `${workspaceId}:${skillId}:${bundleId}`

export const getBundle = async (workspaceId: string, skillId: string, bundleId: string): Promise<SkillBundle | null> => {
    const c = initCache()
    const key = makeKey(workspaceId, skillId, bundleId)

    const cached = await c.get<SkillBundle>(key)
    if (cached) return cached

    const fromStorage = await SkillStorage.getBundle(workspaceId, skillId, bundleId)
    if (!fromStorage) return null

    await c.set(key, fromStorage, DEFAULT_TTL_MS)
    return fromStorage
}

export const putBundle = async (bundle: SkillBundle): Promise<void> => {
    await SkillStorage.putBundle(bundle.workspaceId, bundle.skillId, bundle.bundleId, bundle)
    const c = initCache()
    await c.set(makeKey(bundle.workspaceId, bundle.skillId, bundle.bundleId), bundle, DEFAULT_TTL_MS)
}

export const invalidateBundle = async (workspaceId: string, skillId: string, bundleId: string): Promise<void> => {
    const c = initCache()
    await c.del(makeKey(workspaceId, skillId, bundleId))
}

/**
 * Intentional no-op fleet-wide.
 *
 * Cache keys are immutable per `bundleId`, so a new publish always mints a
 * fresh key that misses the cache and any stale entries for the previous
 * bundle expire via TTL. Building a per-skill key index in Redis to enable
 * proper prefix invalidation would add a write on every `putBundle`, race
 * conditions on concurrent publishes, and ongoing index maintenance — all
 * to clean up entries with no correctness impact.
 *
 * Kept in the API (and async) so existing callers don't change shape and a
 * future implementation can be added without touching call sites.
 */
export const invalidateSkill = async (_workspaceId: string, _skillId: string): Promise<void> => {
    return
}

export const clearAll = async (): Promise<void> => {
    const c = initCache()
    await c.clear()
}
