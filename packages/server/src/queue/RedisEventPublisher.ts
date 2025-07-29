import { IServerSideEventStreamer } from 'flowise-components'
import { createClient } from 'redis'
import logger from '../utils/logger'

export class RedisEventPublisher implements IServerSideEventStreamer {
    private redisPublisher: ReturnType<typeof createClient>

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
    }

    async connect() {
        // TODO: Remove debug logging after fixing Redis pub-sub issues
        // Original: await this.redisPublisher.connect()
        logger.info(`[RedisPublisher] Connecting to Redis...`)
        await this.redisPublisher.connect()
        logger.info(`[RedisPublisher] Connected to Redis successfully`)
    }

    streamCustomEvent(chatId: string, eventType: string, data: any) {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing custom event - chatId: ${chatId}, eventType: ${eventType}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType,
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming custom event:', error)
            logger.error(`[RedisPublisher] Error streaming custom event - chatId: ${chatId}, eventType: ${eventType}`, { error })
        }
    }

    streamStartEvent(chatId: string, data: string) {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing start event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'start',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming start event:', error)
            logger.error(`[RedisPublisher] Error streaming start event - chatId: ${chatId}`, { error })
        }
    }

    streamTokenEvent(chatId: string, data: string) {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing token event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'token',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming token event:', error)
            logger.error(`[RedisPublisher] Error streaming token event - chatId: ${chatId}`, { error })
        }
    }

    streamSourceDocumentsEvent(chatId: string, data: any) {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing sourceDocuments event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'sourceDocuments',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming sourceDocuments event:', error)
            logger.error(`[RedisPublisher] Error streaming sourceDocuments event - chatId: ${chatId}`, { error })
        }
    }

    streamArtifactsEvent(chatId: string, data: any) {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing artifacts event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'artifacts',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming artifacts event:', error)
            logger.error(`[RedisPublisher] Error streaming artifacts event - chatId: ${chatId}`, { error })
        }
    }

    streamUsedToolsEvent(chatId: string, data: any) {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing usedTools event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'usedTools',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming usedTools event:', error)
            logger.error(`[RedisPublisher] Error streaming usedTools event - chatId: ${chatId}`, { error })
        }
    }

    streamCalledToolsEvent(chatId: string, data: any) {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing calledTools event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'calledTools',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming calledTools event:', error)
            logger.error(`[RedisPublisher] Error streaming calledTools event - chatId: ${chatId}`, { error })
        }
    }

    streamFileAnnotationsEvent(chatId: string, data: any) {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing fileAnnotations event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'fileAnnotations',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming fileAnnotations event:', error)
            logger.error(`[RedisPublisher] Error streaming fileAnnotations event - chatId: ${chatId}`, { error })
        }
    }

    streamToolEvent(chatId: string, data: any): void {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing tool event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'tool',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming tool event:', error)
            logger.error(`[RedisPublisher] Error streaming tool event - chatId: ${chatId}`, { error })
        }
    }

    streamAgentReasoningEvent(chatId: string, data: any): void {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing agentReasoning event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'agentReasoning',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming agentReasoning event:', error)
            logger.error(`[RedisPublisher] Error streaming agentReasoning event - chatId: ${chatId}`, { error })
        }
    }

    streamAgentFlowEvent(chatId: string, data: any): void {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing agentFlowEvent event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'agentFlowEvent',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming agentFlow event:', error)
            logger.error(`[RedisPublisher] Error streaming agentFlow event - chatId: ${chatId}`, { error })
        }
    }

    streamAgentFlowExecutedDataEvent(chatId: string, data: any): void {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing agentFlowExecutedData event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'agentFlowExecutedData',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming agentFlowExecutedData event:', error)
            logger.error(`[RedisPublisher] Error streaming agentFlowExecutedData event - chatId: ${chatId}`, { error })
        }
    }

    streamNextAgentEvent(chatId: string, data: any): void {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing nextAgent event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'nextAgent',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming nextAgent event:', error)
            logger.error(`[RedisPublisher] Error streaming nextAgent event - chatId: ${chatId}`, { error })
        }
    }

    streamNextAgentFlowEvent(chatId: string, data: any): void {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing nextAgentFlow event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'nextAgentFlow',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming nextAgentFlow event:', error)
            logger.error(`[RedisPublisher] Error streaming nextAgentFlow event - chatId: ${chatId}`, { error })
        }
    }

    streamActionEvent(chatId: string, data: any): void {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing action event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'action',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming action event:', error)
            logger.error(`[RedisPublisher] Error streaming action event - chatId: ${chatId}`, { error })
        }
    }

    streamAbortEvent(chatId: string): void {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing abort event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'abort',
                    data: '[DONE]'
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming abort event:', error)
            logger.error(`[RedisPublisher] Error streaming abort event - chatId: ${chatId}`, { error })
        }
    }

    streamEndEvent(_: string) {
        // placeholder for future use
    }

    streamErrorEvent(chatId: string, msg: string) {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing error event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'error',
                    data: msg
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming error event:', error)
            logger.error(`[RedisPublisher] Error streaming error event - chatId: ${chatId}`, { error })
        }
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
            console.error('Error streaming metadata event:', error)
        }
    }

    streamUsageMetadataEvent(chatId: string, data: any): void {
        try {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: this.redisPublisher.publish(...)
            logger.info(`[RedisPublisher] Publishing usageMetadata event - chatId: ${chatId}`)
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'usageMetadata',
                    data
                })
            )
        } catch (error) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: console.error('Error streaming usage metadata event:', error)
            logger.error(`[RedisPublisher] Error streaming usage metadata event - chatId: ${chatId}`, { error })
        }
    }

    async disconnect() {
        if (this.redisPublisher) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: await this.redisPublisher.quit()
            logger.info(`[RedisPublisher] Disconnecting from Redis...`)
            await this.redisPublisher.quit()
            logger.info(`[RedisPublisher] Disconnected from Redis`)
        }
    }
}
