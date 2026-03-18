import { IServerSideEventStreamer } from 'flowise-components'
import { createClient } from 'redis'
import logger from '../utils/logger'

export class RedisEventPublisher implements IServerSideEventStreamer {
    private redisPublisher: ReturnType<typeof createClient>
    private connectPromise: Promise<void> | null = null

    constructor() {
        if (process.env.REDIS_URL) {
            this.redisPublisher = createClient({
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
            this.redisPublisher = createClient({
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

        this.setupEventListeners()
    }

    private setupEventListeners() {
        this.redisPublisher.on('connect', () => {
            logger.info(`[RedisEventPublisher] Redis client connecting...`)
        })

        this.redisPublisher.on('ready', () => {
            logger.info(`[RedisEventPublisher] Redis client ready and connected`)
        })

        this.redisPublisher.on('error', (err) => {
            logger.error(`[RedisEventPublisher] Redis client error:`, {
                error: err,
                isReady: this.redisPublisher.isReady,
                isOpen: this.redisPublisher.isOpen
            })
        })

        this.redisPublisher.on('end', () => {
            logger.warn(`[RedisEventPublisher] Redis client connection ended`)
        })

        this.redisPublisher.on('reconnecting', () => {
            logger.info(`[RedisEventPublisher] Redis client reconnecting...`)
        })
    }

    isConnected() {
        return this.redisPublisher.isReady
    }

    async connect(): Promise<void> {
        if (this.connectPromise === null) {
            this.connectPromise = this.redisPublisher.connect().then(() => undefined)
        }
        await this.connectPromise
    }

    private async safePublish(channel: string, message: string) {
        if (!this.redisPublisher.isReady) {
            logger.warn(`[RedisEventPublisher] Cannot publish to channel ${channel}: Redis client not ready`)
            return
        }
        try {
            await this.redisPublisher.publish(channel, message)
        } catch (error) {
            logger.error(`[RedisEventPublisher] Error publishing to channel ${channel}:`, { error })
        }
    }

    streamCustomEvent(chatId: string, eventType: string, data: any) {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType, data }))
    }

    streamStartEvent(chatId: string, data: string) {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'start', data }))
    }

    streamTokenEvent(chatId: string, data: string) {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'token', data }))
    }

    streamThinkingEvent(chatId: string, data: string, duration?: number) {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'thinking',
                    data,
                    duration
                })
            )
        } catch (error) {
            console.error('Error streaming thinking event:', error)
        }
    }

    streamSourceDocumentsEvent(chatId: string, data: any) {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'sourceDocuments', data }))
    }

    streamArtifactsEvent(chatId: string, data: any) {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'artifacts', data }))
    }

    streamUsedToolsEvent(chatId: string, data: any) {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'usedTools', data }))
    }

    streamCalledToolsEvent(chatId: string, data: any) {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'calledTools', data }))
    }

    streamFileAnnotationsEvent(chatId: string, data: any) {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'fileAnnotations', data }))
    }

    streamToolEvent(chatId: string, data: any): void {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'tool', data }))
    }

    streamAgentReasoningEvent(chatId: string, data: any): void {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'agentReasoning', data }))
    }

    streamAgentFlowEvent(chatId: string, data: any): void {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'agentFlowEvent', data }))
    }

    streamAgentFlowExecutedDataEvent(chatId: string, data: any): void {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'agentFlowExecutedData', data }))
    }

    streamNextAgentEvent(chatId: string, data: any): void {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'nextAgent', data }))
    }

    streamNextAgentFlowEvent(chatId: string, data: any): void {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'nextAgentFlow', data }))
    }

    streamActionEvent(chatId: string, data: any): void {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'action', data }))
    }

    streamAbortEvent(chatId: string): void {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'abort', data: '[DONE]' }))
    }

    streamEndEvent(_: string) {
        // placeholder for future use
    }

    streamErrorEvent(chatId: string, msg: string) {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'error', data: msg }))
    }

    streamMetadataEvent(chatId: string, apiResponse: any) {
        try {
            const metadataJson: any = {}
            if (apiResponse.chatId) {
                metadataJson['chatId'] = apiResponse.chatId
            }
            if (apiResponse.chatMessageId) {
                metadataJson['chatMessageId'] = apiResponse.chatMessageId
            }
            if (apiResponse.question) {
                metadataJson['question'] = apiResponse.question
            }
            if (apiResponse.sessionId) {
                metadataJson['sessionId'] = apiResponse.sessionId
            }
            if (apiResponse.memoryType) {
                metadataJson['memoryType'] = apiResponse.memoryType
            }
            if (Object.keys(metadataJson).length > 0) {
                this.streamCustomEvent(chatId, 'metadata', metadataJson)
            }
        } catch (error) {
            logger.error('[RedisEventPublisher] Error streaming metadata event:', { error })
        }
    }

    streamUsageMetadataEvent(chatId: string, data: any): void {
        this.safePublish(chatId, JSON.stringify({ chatId, eventType: 'usageMetadata', data }))
    }

    streamTTSStartEvent(chatId: string, chatMessageId: string, format: string): void {
        this.safePublish(chatId, JSON.stringify({ chatId, chatMessageId, eventType: 'tts_start', data: { format } }))
    }

    streamTTSDataEvent(chatId: string, chatMessageId: string, audioChunk: string): void {
        this.safePublish(chatId, JSON.stringify({ chatId, chatMessageId, eventType: 'tts_data', data: audioChunk }))
    }

    streamTTSEndEvent(chatId: string, chatMessageId: string): void {
        this.safePublish(chatId, JSON.stringify({ chatId, chatMessageId, eventType: 'tts_end', data: {} }))
    }

    streamTTSAbortEvent(chatId: string, chatMessageId: string): void {
        this.safePublish(chatId, JSON.stringify({ chatId, chatMessageId, eventType: 'tts_abort', data: {} }))
    }

    async disconnect() {
        if (this.redisPublisher) {
            await this.redisPublisher.quit()
        }
    }
}
