import { createClient } from 'redis'
import { SSEStreamer } from '../utils/SSEStreamer'
import logger from '../utils/logger'

export class RedisEventSubscriber {
    private redisSubscriber: ReturnType<typeof createClient>
    private sseStreamer: SSEStreamer
    private subscribedChannels: Set<string> = new Set()

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

    subscribe(channel: string) {
        // Subscribe to the Redis channel for job events
        if (!this.redisSubscriber) {
            throw new Error('Redis subscriber not connected.')
        }

        // Check if already subscribed
        if (this.subscribedChannels.has(channel)) {
            return // Prevent duplicate subscription
        }

        this.redisSubscriber.subscribe(channel, (message) => {
            this.handleEvent(message)
        })

        // Mark the channel as subscribed
        this.subscribedChannels.add(channel)
    }

    private handleEvent(message: string) {
        // Parse the message from Redis
        const event = JSON.parse(message)
        const { eventType, chatId, chatMessageId, data } = event

        // Stream the event to the client
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
                this.sseStreamer.streamErrorEvent(chatId, data)
                break
            case 'metadata':
                this.sseStreamer.streamMetadataEvent(chatId, data)
                break
            case 'usageMetadata':
                this.sseStreamer.streamUsageMetadataEvent(chatId, data)
                break
            case 'tts_start':
                this.sseStreamer.streamTTSStartEvent(chatId, chatMessageId, data.format)
                break
            case 'tts_data':
                this.sseStreamer.streamTTSDataEvent(chatId, chatMessageId, data)
                break
            case 'tts_end':
                this.sseStreamer.streamTTSEndEvent(chatId, chatMessageId)
                break
            case 'tts_abort':
                this.sseStreamer.streamTTSAbortEvent(chatId, chatMessageId)
                break
        }
    }

    async disconnect() {
        if (this.redisSubscriber) {
            await this.redisSubscriber.quit()
        }
    }
}
