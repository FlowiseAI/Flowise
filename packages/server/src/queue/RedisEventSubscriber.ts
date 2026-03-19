import { createClient } from 'redis'
import { SSEStreamer } from '../utils/SSEStreamer'
import logger from '../utils/logger'

export class RedisEventSubscriber {
    private redisSubscriber: ReturnType<typeof createClient>
    private sseStreamer: SSEStreamer
    private subscribedChannels: Set<string> = new Set()
    private cleanupInterval: NodeJS.Timeout | null = null

    constructor(sseStreamer: SSEStreamer) {
        if (process.env.REDIS_URL) {
            this.redisSubscriber = createClient({
                url: process.env.REDIS_URL,
                socket: {
                    keepAlive:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                },
                pingInterval:
                    process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                        ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                        : undefined
            })
        } else {
            this.redisSubscriber = createClient({
                username: process.env.REDIS_USERNAME || undefined,
                password: process.env.REDIS_PASSWORD || undefined,
                socket: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    tls: process.env.REDIS_TLS === 'true',
                    cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
                    key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
                    ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined,
                    keepAlive:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                },
                pingInterval:
                    process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                        ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                        : undefined
            })
        }
        this.sseStreamer = sseStreamer

        this.setupEventListeners()
    }

    private setupEventListeners() {
        this.redisSubscriber.on('connect', () => {
            logger.info(`[RedisEventSubscriber] Redis client connecting...`)
        })

        this.redisSubscriber.on('ready', () => {
            logger.info(`[RedisEventSubscriber] Redis client ready and connected`)
            void this.resubscribeAllChannels().catch((err) => {
                logger.error(`[RedisEventSubscriber] Failed to resubscribe to channels after ready:`, { error: err })
            })
        })

        this.redisSubscriber.on('error', (err) => {
            logger.error(`[RedisEventSubscriber] Redis client error:`, {
                error: err,
                isReady: this.redisSubscriber.isReady,
                isOpen: this.redisSubscriber.isOpen,
                subscribedChannelsCount: this.subscribedChannels.size
            })
        })

        this.redisSubscriber.on('end', () => {
            logger.warn(`[RedisEventSubscriber] Redis client connection ended`)
        })

        this.redisSubscriber.on('reconnecting', () => {
            logger.info(`[RedisEventSubscriber] Redis client reconnecting...`)
        })
    }

    async connect() {
        await this.redisSubscriber.connect()
    }

    async subscribe(channel: string) {
        // Subscribe to the Redis channel for job events
        if (!this.redisSubscriber) {
            throw new Error('Redis subscriber not connected.')
        }

        // Check if already subscribed
        if (this.subscribedChannels.has(channel)) {
            return // Prevent duplicate subscription
        }

        await this.redisSubscriber.subscribe(channel, (message) => {
            this.handleEvent(message)
        })

        // Mark the channel as subscribed
        this.subscribedChannels.add(channel)
    }

    async unsubscribe(channel: string): Promise<void> {
        if (!this.redisSubscriber) return
        if (!this.subscribedChannels.has(channel)) return

        try {
            await this.redisSubscriber.unsubscribe(channel)
            logger.debug(
                `[RedisEventSubscriber] Unsubscribed from channel: ${channel}. Active subscriptions: ${this.subscribedChannels.size}`
            )
        } catch (error) {
            logger.error(`[RedisEventSubscriber] Error unsubscribing from channel ${channel}:`, { error })
        } finally {
            this.subscribedChannels.delete(channel)
        }
    }

    getSubscriptionCount(): number {
        return this.subscribedChannels.size
    }

    startPeriodicCleanup(intervalMs: number = 60_000) {
        this.cleanupInterval = setInterval(() => {
            const staleChannels = Array.from(this.subscribedChannels).filter((channel) => !this.sseStreamer.hasClient(channel))
            if (staleChannels.length > 0) {
                for (const channel of staleChannels) {
                    this.unsubscribe(channel)
                }
                logger.info(
                    `[RedisEventSubscriber] Periodic cleanup: removed ${staleChannels.length} stale subscriptions. Remaining: ${this.subscribedChannels.size}`
                )
            }
        }, intervalMs)
    }

    private async resubscribeAllChannels(): Promise<void> {
        if (this.subscribedChannels.size === 0) return

        const channels = Array.from(this.subscribedChannels)
        this.subscribedChannels.clear()

        const messageHandler = (message: string) => this.handleEvent(message)
        for (const channel of channels) {
            try {
                await this.redisSubscriber.subscribe(channel, messageHandler)
                this.subscribedChannels.add(channel)
            } catch (err) {
                logger.error(`[RedisEventSubscriber] Failed to resubscribe to channel ${channel}:`, { error: err })
            }
        }
        logger.info(`[RedisEventSubscriber] Resubscribed to ${this.subscribedChannels.size} channel(s) after reconnection`)
    }

    private handleEvent(message: string) {
        let event: { eventType?: string; chatId?: string; chatMessageId?: string; data?: any }
        try {
            event = JSON.parse(message)
        } catch (err) {
            logger.error(`[RedisEventSubscriber] Failed to parse pub/sub message:`, { error: err, rawMessage: message })
            return
        }

        const { eventType, chatId, chatMessageId, data } = event
        if (!eventType || chatId === undefined) {
            logger.warn(`[RedisEventSubscriber] Invalid event shape (missing eventType or chatId):`, { event })
            return
        }

        const chatMessageIdStr = chatMessageId ?? ''
        const dataObj = data ?? {}

        try {
            switch (eventType) {
                case 'start':
                    this.sseStreamer.streamStartEvent(chatId, data)
                    break
                case 'token':
                    this.sseStreamer.streamTokenEvent(chatId, data)
                    break
                case 'sourceDocuments':
                    this.sseStreamer.streamSourceDocumentsEvent(chatId, data)
                    break
                case 'artifacts':
                    this.sseStreamer.streamArtifactsEvent(chatId, data)
                    break
                case 'usedTools':
                    this.sseStreamer.streamUsedToolsEvent(chatId, data)
                    break
                case 'calledTools':
                    this.sseStreamer.streamCalledToolsEvent(chatId, data)
                    break
                case 'fileAnnotations':
                    this.sseStreamer.streamFileAnnotationsEvent(chatId, data)
                    break
                case 'tool':
                    this.sseStreamer.streamToolEvent(chatId, data)
                    break
                case 'agentReasoning':
                    this.sseStreamer.streamAgentReasoningEvent(chatId, data)
                    break
                case 'nextAgent':
                    this.sseStreamer.streamNextAgentEvent(chatId, data)
                    break
                case 'agentFlowEvent':
                    this.sseStreamer.streamAgentFlowEvent(chatId, data)
                    break
                case 'agentFlowExecutedData':
                    this.sseStreamer.streamAgentFlowExecutedDataEvent(chatId, data)
                    break
                case 'nextAgentFlow':
                    this.sseStreamer.streamNextAgentFlowEvent(chatId, data)
                    break
                case 'action':
                    this.sseStreamer.streamActionEvent(chatId, data)
                    break
                case 'abort':
                    this.sseStreamer.streamAbortEvent(chatId)
                    break
                case 'error':
                    this.sseStreamer.streamErrorEvent(chatId, typeof data === 'string' ? data : String(data ?? ''))
                    break
                case 'metadata':
                    this.sseStreamer.streamMetadataEvent(chatId, data)
                    break
                case 'usageMetadata':
                    this.sseStreamer.streamUsageMetadataEvent(chatId, data)
                    break
                case 'tts_start':
                    this.sseStreamer.streamTTSStartEvent(chatId, chatMessageIdStr, (dataObj as { format?: string }).format ?? '')
                    break
                case 'tts_data':
                    this.sseStreamer.streamTTSDataEvent(chatId, chatMessageIdStr, data)
                    break
                case 'tts_end':
                    this.sseStreamer.streamTTSEndEvent(chatId, chatMessageIdStr)
                    break
                case 'tts_abort':
                    this.sseStreamer.streamTTSAbortEvent(chatId, chatMessageIdStr)
                    break
                default:
                    logger.debug(`[RedisEventSubscriber] Unknown event type: ${eventType}`)
            }
        } catch (err) {
            logger.error(`[RedisEventSubscriber] Error handling pub/sub event:`, { error: err, eventType, chatId })
            if (chatId) {
                this.sseStreamer.streamErrorEvent(chatId, err instanceof Error ? err.message : 'Failed to process stream event')
            }
        }
    }

    async disconnect() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
            this.cleanupInterval = null
        }
        if (this.redisSubscriber) {
            await this.redisSubscriber.quit()
        }
    }
}
