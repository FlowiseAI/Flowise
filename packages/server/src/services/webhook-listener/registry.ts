import { createClient } from 'redis'
import { v4 as uuidv4 } from 'uuid'
import { MODE } from '../../Interface'
import logger from '../../utils/logger'
import { createRedisClient } from '../../utils/redis'
import type { SSEStreamer } from '../../utils/SSEStreamer'
import type { RedisEventSubscriber } from '../../queue/RedisEventSubscriber'

export type WebhookListenerEntry = { listenerId: string; replicaId: string }

export interface IWebhookListenerRegistry {
    /** Register a new listener for a flow. Returns the generated listenerId. */
    register(chatflowid: string): Promise<string>

    /** Refresh TTL on the listener so it stays alive past the inactivity window. */
    heartbeat(chatflowid: string, listenerId: string): Promise<void>

    /** Drop a listener immediately (called on SSE disconnect). */
    unregister(chatflowid: string, listenerId: string): Promise<void>

    /** Look up everyone listening to this flow right now. */
    getActiveListeners(chatflowid: string): Promise<WebhookListenerEntry[]>

    /**
     * Bind an in-flight execution chatId to every listener of a flow. The webhook handler
     * calls this right before invoking the flow so events emitted under `executionChatId` are
     * observed by every listener — locally on this replica AND across replicas via pub/sub.
     */
    bindExecution(chatflowid: string, executionChatId: string): Promise<void>

    /** Get the id used to identify this replica in cross-replica messages. */
    getReplicaId(): string

    /** Optional shutdown hook (queue mode tears down Redis subscribers). */
    dispose?(): Promise<void>
}

/**
 * Single-replica, in-memory registry. Used in MAIN mode where there is no cross-replica concern
 * and Redis is not necessarily configured.
 */
export class InMemoryWebhookListenerRegistry implements IWebhookListenerRegistry {
    private readonly replicaId = `main-${uuidv4()}`
    private readonly listeners: Map<string, Map<string, NodeJS.Timeout>> = new Map()
    private readonly ttlMs: number
    private readonly sseStreamer: SSEStreamer

    constructor(sseStreamer: SSEStreamer, ttlMs = 120_000) {
        this.sseStreamer = sseStreamer
        this.ttlMs = ttlMs
    }

    getReplicaId(): string {
        return this.replicaId
    }

    async register(chatflowid: string): Promise<string> {
        const listenerId = `wh-listener-${uuidv4()}`
        this.scheduleEviction(chatflowid, listenerId)
        return listenerId
    }

    async heartbeat(chatflowid: string, listenerId: string): Promise<void> {
        this.scheduleEviction(chatflowid, listenerId)
    }

    async unregister(chatflowid: string, listenerId: string): Promise<void> {
        const inner = this.listeners.get(chatflowid)
        if (!inner) return
        const handle = inner.get(listenerId)
        if (handle) clearTimeout(handle)
        inner.delete(listenerId)
        if (inner.size === 0) this.listeners.delete(chatflowid)
    }

    async getActiveListeners(chatflowid: string): Promise<WebhookListenerEntry[]> {
        const inner = this.listeners.get(chatflowid)
        if (!inner || inner.size === 0) return []
        return Array.from(inner.keys()).map((listenerId) => ({ listenerId, replicaId: this.replicaId }))
    }

    async bindExecution(chatflowid: string, executionChatId: string): Promise<void> {
        const listeners = await this.getActiveListeners(chatflowid)
        for (const { listenerId } of listeners) {
            this.sseStreamer.addObserver(executionChatId, listenerId)
        }
    }

    private scheduleEviction(chatflowid: string, listenerId: string) {
        let inner = this.listeners.get(chatflowid)
        if (!inner) {
            inner = new Map()
            this.listeners.set(chatflowid, inner)
        }
        const existing = inner.get(listenerId)
        if (existing) clearTimeout(existing)
        const handle = setTimeout(() => {
            this.unregister(chatflowid, listenerId).catch(() => {})
        }, this.ttlMs)
        inner.set(listenerId, handle)
    }
}

/**
 * Redis-backed registry. Listeners are kept in a per-flow hash with a refreshing TTL. Each
 * replica boots subscribed to its own control channel; when a webhook fires on replica A and
 * finds a listener on replica B, A publishes to B's channel telling it to observe events for
 * the in-flight executionChatId on its local SSE client.
 */
export class RedisWebhookListenerRegistry implements IWebhookListenerRegistry {
    private readonly replicaId = `replica-${uuidv4()}`
    private readonly publisher: ReturnType<typeof createClient>
    private readonly subscriber: ReturnType<typeof createClient>
    private readonly sseStreamer: SSEStreamer
    private readonly redisEventSubscriber: RedisEventSubscriber
    private readonly ttlSeconds: number
    private readonly listenerKey = (chatflowid: string) => `wh-listener:${chatflowid}`
    private readonly bindChannel = (replicaId: string) => `wh-listener-bind:${replicaId}`

    constructor(sseStreamer: SSEStreamer, redisEventSubscriber: RedisEventSubscriber, ttlSeconds = 120) {
        this.sseStreamer = sseStreamer
        this.redisEventSubscriber = redisEventSubscriber
        this.ttlSeconds = ttlSeconds
        this.publisher = createRedisClient()
        this.subscriber = createRedisClient()
    }

    getReplicaId(): string {
        return this.replicaId
    }

    async connect(): Promise<void> {
        await Promise.all([this.publisher.connect(), this.subscriber.connect()])

        await this.subscriber.subscribe(this.bindChannel(this.replicaId), async (message) => {
            try {
                const parsed = JSON.parse(message) as { executionChatId?: string; listenerId?: string }
                if (!parsed.executionChatId || !parsed.listenerId) return
                // Only attach if the listener actually lives on this replica (sanity check —
                // dispatcher already routed by replicaId, but the local SSE client is the
                // ground truth).
                if (!this.sseStreamer.hasClient(parsed.listenerId)) {
                    logger.warn(
                        `[WebhookListenerRegistry] Bind dropped: listener ${parsed.listenerId} not on this replica (${this.replicaId}). ` +
                            `Likely caused by ALB routing without sticky sessions, or by a webhook firing between register and stream.`
                    )
                    return
                }

                this.sseStreamer.addObserver(parsed.executionChatId, parsed.listenerId)
                // Subscribe to the execution channel so the worker's published events land
                // on this replica and get fanned out to the local listener client.
                await this.redisEventSubscriber.subscribe(parsed.executionChatId)
            } catch (err) {
                logger.error('[WebhookListenerRegistry] Failed to handle bind notification', { error: err })
            }
        })

        logger.info(`[WebhookListenerRegistry] Connected to Redis (replicaId=${this.replicaId})`)
    }

    async register(_chatflowid: string): Promise<string> {
        return `wh-listener-${uuidv4()}`
    }

    async heartbeat(chatflowid: string, listenerId: string): Promise<void> {
        // Re-set the field (idempotent) and bump the key's TTL so individual listeners staying
        // connected keep the whole hash alive.
        await this.publisher.hSet(this.listenerKey(chatflowid), listenerId, this.replicaId)
        await this.publisher.expire(this.listenerKey(chatflowid), this.ttlSeconds)
    }

    async unregister(chatflowid: string, listenerId: string): Promise<void> {
        await this.publisher.hDel(this.listenerKey(chatflowid), listenerId)
    }

    async getActiveListeners(chatflowid: string): Promise<WebhookListenerEntry[]> {
        const raw = await this.publisher.hGetAll(this.listenerKey(chatflowid))
        return Object.entries(raw).map(([listenerId, replicaId]) => ({ listenerId, replicaId: String(replicaId) }))
    }

    async bindExecution(chatflowid: string, executionChatId: string): Promise<void> {
        const listeners = await this.getActiveListeners(chatflowid)
        if (listeners.length === 0) return

        for (const { listenerId, replicaId } of listeners) {
            if (replicaId === this.replicaId) {
                // Listener lives on this replica — attach the observer immediately, no pub/sub hop.
                this.sseStreamer.addObserver(executionChatId, listenerId)
                await this.redisEventSubscriber.subscribe(executionChatId)
            } else {
                await this.publisher.publish(this.bindChannel(replicaId), JSON.stringify({ executionChatId, listenerId }))
            }
        }
    }

    async dispose(): Promise<void> {
        try {
            await this.subscriber.unsubscribe()
        } catch {
            /* ignore */
        }
        await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()])
    }
}

let registry: IWebhookListenerRegistry | null = null

/**
 * Build the right registry implementation for the current MODE. Called once during App init.
 * Queue mode: Redis-backed, requires a connected RedisEventSubscriber. Otherwise: in-memory.
 */
export const initWebhookListenerRegistry = async (
    sseStreamer: SSEStreamer,
    redisEventSubscriber?: RedisEventSubscriber
): Promise<IWebhookListenerRegistry> => {
    if (process.env.MODE === MODE.QUEUE && redisEventSubscriber) {
        const r = new RedisWebhookListenerRegistry(sseStreamer, redisEventSubscriber)
        await r.connect()
        registry = r
    } else {
        registry = new InMemoryWebhookListenerRegistry(sseStreamer)
    }
    return registry
}

export const getWebhookListenerRegistry = (): IWebhookListenerRegistry => {
    if (!registry) {
        throw new Error('WebhookListenerRegistry has not been initialized')
    }
    return registry
}
