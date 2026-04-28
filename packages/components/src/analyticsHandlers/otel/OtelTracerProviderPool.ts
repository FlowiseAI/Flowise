import { createHash } from 'crypto'
import { Tracer } from '@opentelemetry/api'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'

import { OtelDestinationConfig } from './OtelConfigSchema'
import { createTracerProvider } from './OtelDestinationFactory'

interface PoolEntry {
    provider: NodeTracerProvider
    tracer: Tracer
    configHash: string
}

/**
 * Recursively produce a JSON string with object keys sorted at every level.
 * This ensures deterministic output regardless of key insertion order, while
 * preserving all nested values (unlike `JSON.stringify(obj, topLevelKeys)`,
 * which uses its second argument as a filter and strips nested properties).
 */
function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value)
    }
    if (Array.isArray(value)) {
        return '[' + value.map((v) => stableStringify(v)).join(',') + ']'
    }
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

function computeConfigHash(config: OtelDestinationConfig): string {
    const normalized = stableStringify(config)
    return createHash('sha256').update(normalized).digest('hex')
}

export class OtelTracerProviderPool {
    private static instance: OtelTracerProviderPool | undefined
    private pool: Map<string, PoolEntry> = new Map()

    static readonly DEFAULT_MAX_POOL_SIZE = 256
    private readonly maxPoolSize: number

    private constructor() {
        const envVal = parseInt(process.env.OTEL_MAX_POOL_SIZE ?? '', 10)
        this.maxPoolSize = Number.isFinite(envVal) && envVal > 0 ? envVal : OtelTracerProviderPool.DEFAULT_MAX_POOL_SIZE
    }

    static getInstance(): OtelTracerProviderPool {
        if (!OtelTracerProviderPool.instance) {
            OtelTracerProviderPool.instance = new OtelTracerProviderPool()
        }
        return OtelTracerProviderPool.instance
    }

    async getOrCreate(chatflowId: string, destConfig: OtelDestinationConfig): Promise<Tracer> {
        const hash = computeConfigHash(destConfig)
        const existing = this.pool.get(chatflowId)

        if (existing) {
            if (existing.configHash === hash) {
                this.touchEntry(chatflowId, existing)
                return existing.tracer
            }
            console.info(`[OTEL Pool] Config changed for chatflow ${chatflowId}, rebuilding provider`)
            await this.invalidate(chatflowId)
        }

        await this.evictIfAtCapacity()

        try {
            const provider = createTracerProvider(destConfig, chatflowId)
            const tracer = provider.getTracer('flowise-otel')

            this.pool.set(chatflowId, { provider, tracer, configHash: hash })
            console.info(`[OTEL Pool] Created TracerProvider for chatflow ${chatflowId}`)

            return tracer
        } catch (err) {
            console.error(`[OTEL Pool] Failed to create TracerProvider for chatflow ${chatflowId}: ${err}`)
            throw err
        }
    }

    /**
     * Move entry to the end of the Map iteration order (most-recently-used).
     * JS Map preserves insertion order, so delete + re-set moves the key last.
     */
    private touchEntry(chatflowId: string, entry: PoolEntry): void {
        this.pool.delete(chatflowId)
        this.pool.set(chatflowId, entry)
    }

    /**
     * When the pool is at capacity, evict the least-recently-used entry
     * (the first key in Map iteration order).
     */
    private async evictIfAtCapacity(): Promise<void> {
        if (this.pool.size < this.maxPoolSize) return

        const lruKey = this.pool.keys().next().value
        if (lruKey) {
            console.info(`[OTEL Pool] Pool at capacity (${this.maxPoolSize}), evicting LRU entry: ${lruKey}`)
            await this.invalidate(lruKey)
        }
    }

    async invalidate(chatflowId: string): Promise<void> {
        const entry = this.pool.get(chatflowId)
        if (!entry) return

        this.pool.delete(chatflowId)

        try {
            await entry.provider.forceFlush()
            await entry.provider.shutdown()
            console.info(`[OTEL Pool] Invalidated TracerProvider for chatflow ${chatflowId}`)
        } catch (err) {
            console.warn(`[OTEL Pool] Error shutting down TracerProvider for chatflow ${chatflowId}: ${err}`)
        }
    }

    async shutdownAll(): Promise<void> {
        const entries = Array.from(this.pool.entries())
        this.pool.clear()

        const results = await Promise.allSettled(
            entries.map(async ([chatflowId, entry]) => {
                try {
                    await entry.provider.forceFlush()
                    await entry.provider.shutdown()
                    console.info(`[OTEL Pool] Shut down TracerProvider for chatflow ${chatflowId}`)
                } catch (err) {
                    console.warn(`[OTEL Pool] Error shutting down TracerProvider for chatflow ${chatflowId}: ${err}`)
                    throw err
                }
            })
        )

        const failed = results.filter((r) => r.status === 'rejected')
        if (failed.length > 0) {
            console.warn(`[OTEL Pool] ${failed.length}/${entries.length} providers failed to shut down cleanly`)
        }

        console.info(`[OTEL Pool] Shutdown complete (${entries.length} providers)`)
    }

    getProvider(chatflowId: string): NodeTracerProvider | undefined {
        return this.pool.get(chatflowId)?.provider
    }

    /** Visible for testing */
    get size(): number {
        return this.pool.size
    }

    /** Reset singleton — only for tests */
    static resetInstance(): void {
        OtelTracerProviderPool.instance = undefined
    }
}
