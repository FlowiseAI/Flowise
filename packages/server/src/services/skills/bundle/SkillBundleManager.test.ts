import type { SkillBundle } from '../entities'

// =============================================================================
// Mock SkillStorage so the manager never touches `flowise-components` (which
// pulls in the storage provider chain and is unfit for unit tests).
// =============================================================================

const mockStorageGetBundle = jest.fn<Promise<SkillBundle | null>, [string, string, string]>()
const mockStoragePutBundle = jest.fn<Promise<void>, [string, string, string, SkillBundle]>()

jest.mock('../SkillStorage', () => ({
    __esModule: true,
    getBundle: (...args: [string, string, string]) => mockStorageGetBundle(...args),
    putBundle: (...args: [string, string, string, SkillBundle]) => mockStoragePutBundle(...args)
}))

// Import after the mock is registered.
import * as SkillBundleManager from './SkillBundleManager'

// =============================================================================
// Fixture builder
// =============================================================================

const makeBundle = (overrides: Partial<SkillBundle> = {}): SkillBundle => ({
    schemaVersion: 1,
    bundleId: 'bundle-1',
    workspaceId: 'ws-1',
    skillId: 'skill-1',
    builtAt: new Date().toISOString(),
    entries: {},
    dependencyGraph: {},
    reverseGraph: {},
    ...overrides
})

beforeEach(async () => {
    mockStorageGetBundle.mockReset()
    mockStoragePutBundle.mockReset()
    // The cache is module-level state — clear it between tests so prior
    // entries don't leak.
    await SkillBundleManager.clearAll()
})

// =============================================================================
// getBundle — three-tier read path (L1 → L3, with cache backfill)
// =============================================================================

describe('SkillBundleManager.getBundle', () => {
    it('reads from object storage on cache miss and backfills the cache', async () => {
        const bundle = makeBundle()
        mockStorageGetBundle.mockResolvedValueOnce(bundle)

        const out = await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')
        expect(out).toEqual(bundle)
        expect(mockStorageGetBundle).toHaveBeenCalledTimes(1)
        expect(mockStorageGetBundle).toHaveBeenCalledWith('ws-1', 'skill-1', 'bundle-1')
    })

    it('serves subsequent reads from the in-memory cache (no second storage hit)', async () => {
        const bundle = makeBundle()
        mockStorageGetBundle.mockResolvedValueOnce(bundle)

        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')
        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')
        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')

        expect(mockStorageGetBundle).toHaveBeenCalledTimes(1)
    })

    it('returns null when the bundle is missing from storage and does not cache the miss', async () => {
        mockStorageGetBundle.mockResolvedValue(null)

        const first = await SkillBundleManager.getBundle('ws-1', 'skill-1', 'missing')
        const second = await SkillBundleManager.getBundle('ws-1', 'skill-1', 'missing')

        expect(first).toBeNull()
        expect(second).toBeNull()
        // Misses are NOT cached — every call falls through to storage.
        expect(mockStorageGetBundle).toHaveBeenCalledTimes(2)
    })

    it('partitions cache entries by (workspaceId, skillId, bundleId)', async () => {
        const a = makeBundle({ bundleId: 'bundle-A', skillId: 'skill-A' })
        const b = makeBundle({ bundleId: 'bundle-B', skillId: 'skill-B' })
        mockStorageGetBundle.mockImplementation(async (_ws, skillId, bundleId) => {
            if (skillId === 'skill-A' && bundleId === 'bundle-A') return a
            if (skillId === 'skill-B' && bundleId === 'bundle-B') return b
            return null
        })

        await SkillBundleManager.getBundle('ws-1', 'skill-A', 'bundle-A')
        await SkillBundleManager.getBundle('ws-1', 'skill-B', 'bundle-B')

        // Both entries are independently cached.
        expect((await SkillBundleManager.getBundle('ws-1', 'skill-A', 'bundle-A'))!.bundleId).toBe('bundle-A')
        expect((await SkillBundleManager.getBundle('ws-1', 'skill-B', 'bundle-B'))!.bundleId).toBe('bundle-B')
        // Storage was only consulted on the first read for each key.
        expect(mockStorageGetBundle).toHaveBeenCalledTimes(2)
    })
})

// =============================================================================
// putBundle — write-through to storage + cache
// =============================================================================

describe('SkillBundleManager.putBundle', () => {
    it('writes to object storage and primes the cache', async () => {
        const bundle = makeBundle()
        mockStoragePutBundle.mockResolvedValue(undefined)

        await SkillBundleManager.putBundle(bundle)
        expect(mockStoragePutBundle).toHaveBeenCalledWith('ws-1', 'skill-1', 'bundle-1', bundle)

        // Subsequent reads must NOT touch storage.
        const out = await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')
        expect(out).toEqual(bundle)
        expect(mockStorageGetBundle).not.toHaveBeenCalled()
    })
})

// =============================================================================
// invalidateBundle — explicit per-bundleId eviction
// =============================================================================

describe('SkillBundleManager.invalidateBundle', () => {
    it('removes the cached entry so the next read falls through to storage', async () => {
        const bundle = makeBundle()
        mockStorageGetBundle.mockResolvedValue(bundle)

        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')
        await SkillBundleManager.invalidateBundle('ws-1', 'skill-1', 'bundle-1')
        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')

        expect(mockStorageGetBundle).toHaveBeenCalledTimes(2)
    })

    it('does not touch sibling cache entries', async () => {
        const a = makeBundle({ bundleId: 'bundle-A' })
        const b = makeBundle({ bundleId: 'bundle-B' })
        mockStorageGetBundle.mockImplementation(async (_ws, _skill, bundleId) => (bundleId === 'bundle-A' ? a : b))

        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-A')
        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-B')
        await SkillBundleManager.invalidateBundle('ws-1', 'skill-1', 'bundle-A')

        // bundle-B is still cached → only bundle-A re-hits storage.
        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-A')
        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-B')
        expect(mockStorageGetBundle.mock.calls.filter(([, , id]) => id === 'bundle-A')).toHaveLength(2)
        expect(mockStorageGetBundle.mock.calls.filter(([, , id]) => id === 'bundle-B')).toHaveLength(1)
    })
})

// =============================================================================
// invalidateSkill — intentional fleet-wide no-op
// =============================================================================

describe('SkillBundleManager.invalidateSkill', () => {
    it('is an intentional no-op (cache keys are immutable per bundleId)', async () => {
        const bundle = makeBundle()
        mockStorageGetBundle.mockResolvedValue(bundle)

        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')
        await SkillBundleManager.invalidateSkill('ws-1', 'skill-1')
        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')

        // The cached entry survives — storage was only consulted once.
        expect(mockStorageGetBundle).toHaveBeenCalledTimes(1)
    })
})

// =============================================================================
// clearAll — test hook used by other suites
// =============================================================================

describe('SkillBundleManager.clearAll', () => {
    it('drops every cached entry across all (workspace, skill, bundle) keys', async () => {
        const bundle = makeBundle()
        mockStorageGetBundle.mockResolvedValue(bundle)

        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')
        await SkillBundleManager.clearAll()
        await SkillBundleManager.getBundle('ws-1', 'skill-1', 'bundle-1')

        expect(mockStorageGetBundle).toHaveBeenCalledTimes(2)
    })
})
