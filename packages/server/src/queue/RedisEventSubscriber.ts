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
    }

    async connect() {
        // TODO: Remove debug logging after fixing Redis pub-sub issues
        // Original: await this.redisSubscriber.connect()
        logger.info(`[RedisSubscriber] Connecting to Redis...`)
        await this.redisSubscriber.connect()
        logger.info(`[RedisSubscriber] Connected to Redis successfully`)
    }

    subscribe(channel: string) {
        // Subscribe to the Redis channel for job events
        if (!this.redisSubscriber) {
            throw new Error('Redis subscriber not connected.')
        }

        // Check if already subscribed
        if (this.subscribedChannels.has(channel)) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: return // Prevent duplicate subscription
            logger.info(`[RedisSubscriber] Already subscribed to channel: ${channel}`)
            return // Prevent duplicate subscription
        }

        // TODO: Remove debug logging after fixing Redis pub-sub issues
        // Original: this.redisSubscriber.subscribe(channel, (message) => { this.handleEvent(message) })
        logger.info(`[RedisSubscriber] Subscribing to channel: ${channel}`)
        this.redisSubscriber.subscribe(channel, (message) => {
            this.handleEvent(message)
        })

        // Mark the channel as subscribed
        this.subscribedChannels.add(channel)
        logger.info(`[RedisSubscriber] Successfully subscribed to channel: ${channel}`)
    }

    private handleEvent(message: string) {
        try {
            // Parse the message from Redis
            const event = JSON.parse(message)
            const { eventType, chatId, data } = event

            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: switch (eventType) { ... }
            logger.info(`[RedisSubscriber] Received event - chatId: ${chatId}, eventType: ${eventType}`)

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
                case 'calledTools':
                    this.sseStreamer.streamCalledToolsEvent(chatId, data)
                    break
                case 'usageMetadata':
                    this.sseStreamer.streamUsageMetadataEvent(chatId, data)
                    break
                default:
                    // TODO: Remove debug logging after fixing Redis pub-sub issues
                    // Original: break
                    logger.warn(`[RedisSubscriber] Unknown event type: ${eventType} for chatId: ${chatId}`)
                    break
            }
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no error handling)
            logger.error(`[RedisSubscriber] Error handling event`, { error, message })
        }
    }

    async disconnect() {
        if (this.redisSubscriber) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: await this.redisSubscriber.quit()
            logger.info(`[RedisSubscriber] Disconnecting from Redis...`)
            await this.redisSubscriber.quit()
            logger.info(`[RedisSubscriber] Disconnected from Redis`)
        }
    }
}
