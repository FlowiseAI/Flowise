import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { OtelTracerProviderPool } from './OtelTracerProviderPool'
import { OtelDestinationConfigSchema } from './OtelConfigSchema'
import type { OtelDestinationConfig } from './OtelConfigSchema'

// Mock createTracerProvider so tests don't create real exporters / network connections.
// Each call returns a fresh NodeTracerProvider with forceFlush/shutdown spied on.
const mockForceFlush = jest.fn().mockResolvedValue(undefined)
const mockShutdown = jest.fn().mockResolvedValue(undefined)

jest.mock('../../../src/analyticsHandlers/otel/OtelDestinationFactory', () => ({
    createTracerProvider: jest.fn(() => {
        const provider = Object.create(NodeTracerProvider.prototype) as NodeTracerProvider
        ;(provider as any).forceFlush = mockForceFlush
        ;(provider as any).shutdown = mockShutdown
        ;(provider as any).getTracer = jest.fn().mockReturnValue({ startSpan: jest.fn() })
        return provider
    })
}))

function makeConfig(overrides: Partial<OtelDestinationConfig> = {}): OtelDestinationConfig {
    return OtelDestinationConfigSchema.parse({
        endpoint: 'https://otlp.example.com',
        ...overrides
    })
}

describe('OtelTracerProviderPool', () => {
    let pool: OtelTracerProviderPool

    beforeEach(() => {
        OtelTracerProviderPool.resetInstance()
        pool = OtelTracerProviderPool.getInstance()
        jest.clearAllMocks()
        jest.spyOn(console, 'info').mockImplementation(() => {})
        jest.spyOn(console, 'warn').mockImplementation(() => {})
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    // -----------------------------------------------------------------------
    // getOrCreate creates a new TracerProvider on first call
    // -----------------------------------------------------------------------

    it('creates a new TracerProvider on first call for a chatflowId', async () => {
        const config = makeConfig()
        const tracer = await pool.getOrCreate('flow-1', config)

        expect(tracer).toBeDefined()
        expect(pool.size).toBe(1)
    })

    // -----------------------------------------------------------------------
    // getOrCreate returns same tracer on subsequent calls (idempotent)
    // -----------------------------------------------------------------------

    it('returns the same tracer on subsequent calls with the same config', async () => {
        const config = makeConfig()
        const tracer1 = await pool.getOrCreate('flow-1', config)
        const tracer2 = await pool.getOrCreate('flow-1', config)

        expect(tracer1).toBe(tracer2)
        expect(pool.size).toBe(1)
    })

    // -----------------------------------------------------------------------
    // config hash mismatch triggers invalidation and rebuild
    // -----------------------------------------------------------------------

    it('triggers invalidation and rebuild when config changes', async () => {
        const config1 = makeConfig({ serviceName: 'service-a' })
        const tracer1 = await pool.getOrCreate('flow-1', config1)

        const config2 = makeConfig({ serviceName: 'service-b' })
        const tracer2 = await pool.getOrCreate('flow-1', config2)

        expect(tracer2).not.toBe(tracer1)
        expect(pool.size).toBe(1)
    })

    // -----------------------------------------------------------------------
    // Regression: nested config differences (e.g. auth headers) must be
    // reflected in the hash. Previously `JSON.stringify(config, topLevelKeys)`
    // was used as a replacer, which stripped all nested values and caused two
    // configs with different headers to collide on the same hash.
    // -----------------------------------------------------------------------

    it('treats configs with different nested headers as distinct (hash must not collide)', async () => {
        const config1 = makeConfig({ headers: { Authorization: 'Bearer tenant-a-token' } })
        const tracer1 = await pool.getOrCreate('flow-1', config1)

        const config2 = makeConfig({ headers: { Authorization: 'Bearer tenant-b-token' } })
        const tracer2 = await pool.getOrCreate('flow-1', config2)

        expect(tracer2).not.toBe(tracer1)
        expect(mockForceFlush).toHaveBeenCalledTimes(1)
        expect(mockShutdown).toHaveBeenCalledTimes(1)
        expect(pool.size).toBe(1)
    })

    it('treats header key-order differences as the same config (stable hash)', async () => {
        const config1 = makeConfig({ headers: { Authorization: 'Bearer t', 'X-Tenant': 'a' } })
        const tracer1 = await pool.getOrCreate('flow-1', config1)

        const config2 = makeConfig({ headers: { 'X-Tenant': 'a', Authorization: 'Bearer t' } })
        const tracer2 = await pool.getOrCreate('flow-1', config2)

        expect(tracer2).toBe(tracer1)
        expect(mockForceFlush).not.toHaveBeenCalled()
        expect(mockShutdown).not.toHaveBeenCalled()
        expect(pool.size).toBe(1)
    })

    // -----------------------------------------------------------------------
    // invalidate calls forceFlush/shutdown and removes entry
    // -----------------------------------------------------------------------

    it('invalidate() calls forceFlush() and shutdown() and removes the entry', async () => {
        const config = makeConfig()
        await pool.getOrCreate('flow-1', config)
        expect(pool.size).toBe(1)

        await pool.invalidate('flow-1')

        expect(mockForceFlush).toHaveBeenCalled()
        expect(mockShutdown).toHaveBeenCalled()
        expect(pool.size).toBe(0)
    })

    it('invalidate() is a no-op for an unknown chatflowId', async () => {
        await pool.invalidate('non-existent')

        expect(mockForceFlush).not.toHaveBeenCalled()
        expect(mockShutdown).not.toHaveBeenCalled()
    })

    // -----------------------------------------------------------------------
    // getOrCreate after invalidate creates a fresh TracerProvider
    // -----------------------------------------------------------------------

    it('creates a fresh TracerProvider after invalidate()', async () => {
        const config = makeConfig()
        const tracer1 = await pool.getOrCreate('flow-1', config)

        await pool.invalidate('flow-1')
        expect(pool.size).toBe(0)

        const tracer2 = await pool.getOrCreate('flow-1', config)
        expect(tracer2).not.toBe(tracer1)
        expect(pool.size).toBe(1)
    })

    // -----------------------------------------------------------------------
    // shutdownAll flushes, shuts down all entries, clears pool, resets initialized
    // -----------------------------------------------------------------------

    it('shutdownAll() flushes and shuts down all entries and clears pool', async () => {
        const config = makeConfig()
        await pool.getOrCreate('flow-1', config)
        await pool.getOrCreate('flow-2', makeConfig({ serviceName: 'other' }))
        expect(pool.size).toBe(2)

        await pool.shutdownAll()

        expect(mockForceFlush).toHaveBeenCalledTimes(2)
        expect(mockShutdown).toHaveBeenCalledTimes(2)
        expect(pool.size).toBe(0)

        const tracer = await pool.getOrCreate('flow-3', config)
        expect(tracer).toBeDefined()
        expect(pool.size).toBe(1)
    })

    // -----------------------------------------------------------------------
    // getProvider returns NodeTracerProvider for cached chatflow
    // -----------------------------------------------------------------------

    it('getProvider() returns the NodeTracerProvider for a cached chatflow', async () => {
        const config = makeConfig()
        await pool.getOrCreate('flow-1', config)

        const provider = pool.getProvider('flow-1')
        expect(provider).toBeInstanceOf(NodeTracerProvider)
    })

    it('getProvider() returns undefined for an unknown chatflowId', () => {
        expect(pool.getProvider('non-existent')).toBeUndefined()
    })

    // -----------------------------------------------------------------------
    // resetInstance clears the singleton for test isolation
    // -----------------------------------------------------------------------

    it('resetInstance() clears the singleton so getInstance() returns a fresh pool', async () => {
        const config = makeConfig()
        await pool.getOrCreate('flow-1', config)
        expect(pool.size).toBe(1)

        OtelTracerProviderPool.resetInstance()
        const freshPool = OtelTracerProviderPool.getInstance()

        expect(freshPool).not.toBe(pool)
        expect(freshPool.size).toBe(0)
    })

    // -----------------------------------------------------------------------
    // LRU eviction — pool size is bounded
    // -----------------------------------------------------------------------

    describe('LRU eviction (bounded pool size)', () => {
        const MAX = 3

        beforeEach(() => {
            process.env.OTEL_MAX_POOL_SIZE = String(MAX)
            OtelTracerProviderPool.resetInstance()
            pool = OtelTracerProviderPool.getInstance()
        })

        afterEach(() => {
            delete process.env.OTEL_MAX_POOL_SIZE
        })

        it('evicts the least-recently-used entry when pool reaches capacity', async () => {
            const config = makeConfig()
            await pool.getOrCreate('flow-1', config)
            await pool.getOrCreate('flow-2', config)
            await pool.getOrCreate('flow-3', config)
            expect(pool.size).toBe(MAX)

            await pool.getOrCreate('flow-4', config)

            expect(pool.size).toBe(MAX)
            expect(pool.getProvider('flow-1')).toBeUndefined()
            expect(pool.getProvider('flow-2')).toBeDefined()
            expect(pool.getProvider('flow-3')).toBeDefined()
            expect(pool.getProvider('flow-4')).toBeDefined()
        })

        it('accessing an existing entry promotes it so it is not evicted next', async () => {
            const config = makeConfig()
            await pool.getOrCreate('flow-1', config)
            await pool.getOrCreate('flow-2', config)
            await pool.getOrCreate('flow-3', config)

            // "touch" flow-1 by accessing it again — promotes it to most-recently-used
            await pool.getOrCreate('flow-1', config)

            // Adding flow-4 should now evict flow-2 (the new LRU), not flow-1
            await pool.getOrCreate('flow-4', config)

            expect(pool.size).toBe(MAX)
            expect(pool.getProvider('flow-1')).toBeDefined()
            expect(pool.getProvider('flow-2')).toBeUndefined()
            expect(pool.getProvider('flow-3')).toBeDefined()
            expect(pool.getProvider('flow-4')).toBeDefined()
        })

        it('calls forceFlush and shutdown on the evicted provider', async () => {
            const config = makeConfig()
            await pool.getOrCreate('flow-1', config)
            await pool.getOrCreate('flow-2', config)
            await pool.getOrCreate('flow-3', config)
            jest.clearAllMocks()

            await pool.getOrCreate('flow-4', config)

            expect(mockForceFlush).toHaveBeenCalled()
            expect(mockShutdown).toHaveBeenCalled()
        })

        it('awaits invalidation on config change before creating new provider', async () => {
            const config1 = makeConfig({ serviceName: 'service-a' })
            await pool.getOrCreate('flow-1', config1)
            jest.clearAllMocks()

            const config2 = makeConfig({ serviceName: 'service-b' })
            await pool.getOrCreate('flow-1', config2)

            expect(mockForceFlush).toHaveBeenCalledTimes(1)
            expect(mockShutdown).toHaveBeenCalledTimes(1)
            expect(pool.size).toBe(1)
        })

        it('uses DEFAULT_MAX_POOL_SIZE when env var is not set', async () => {
            delete process.env.OTEL_MAX_POOL_SIZE
            OtelTracerProviderPool.resetInstance()
            const defaultPool = OtelTracerProviderPool.getInstance()

            expect(OtelTracerProviderPool.DEFAULT_MAX_POOL_SIZE).toBe(256)

            const config = makeConfig()
            await defaultPool.getOrCreate('flow-1', config)
            expect(defaultPool.size).toBe(1)
        })

        it('ignores invalid OTEL_MAX_POOL_SIZE values and falls back to default', async () => {
            process.env.OTEL_MAX_POOL_SIZE = 'not-a-number'
            OtelTracerProviderPool.resetInstance()
            const fallbackPool = OtelTracerProviderPool.getInstance()

            const config = makeConfig()
            for (let i = 0; i < 5; i++) {
                await fallbackPool.getOrCreate(`flow-${i}`, config)
            }
            // All 5 fit because default is 256
            expect(fallbackPool.size).toBe(5)
        })

        it('ignores negative OTEL_MAX_POOL_SIZE values and falls back to default', async () => {
            process.env.OTEL_MAX_POOL_SIZE = '-10'
            OtelTracerProviderPool.resetInstance()
            const fallbackPool = OtelTracerProviderPool.getInstance()

            const config = makeConfig()
            for (let i = 0; i < 5; i++) {
                await fallbackPool.getOrCreate(`flow-${i}`, config)
            }
            expect(fallbackPool.size).toBe(5)
        })
    })
})
