import { IServerSideEventStreamer } from 'flowise-components'
import { createClient } from 'redis'

export class RedisEventPublisher implements IServerSideEventStreamer {
    private redisPublisher: ReturnType<typeof createClient>

    constructor() {
        if (process.env.REDIS_URL) {
            this.redisPublisher = createClient({
                url: process.env.REDIS_URL
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
                    ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined
                }
            })
        }
    }

    async connect() {
        await this.redisPublisher.connect()
    }

    streamCustomEvent(chatId: string, eventType: string, data: any) {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType,
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming custom event:', error)
        }
    }

    streamStartEvent(chatId: string, data: string) {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'start',
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming start event:', error)
        }
    }

    streamTokenEvent(chatId: string, data: string) {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'token',
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming token event:', error)
        }
    }

    streamSourceDocumentsEvent(chatId: string, data: any) {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'sourceDocuments',
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming sourceDocuments event:', error)
        }
    }

    streamArtifactsEvent(chatId: string, data: any) {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'artifacts',
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming artifacts event:', error)
        }
    }

    streamUsedToolsEvent(chatId: string, data: any) {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'usedTools',
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming usedTools event:', error)
        }
    }

    streamFileAnnotationsEvent(chatId: string, data: any) {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'fileAnnotations',
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming fileAnnotations event:', error)
        }
    }

    streamToolEvent(chatId: string, data: any): void {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'tool',
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming tool event:', error)
        }
    }

    streamAgentReasoningEvent(chatId: string, data: any): void {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'agentReasoning',
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming agentReasoning event:', error)
        }
    }

    streamNextAgentEvent(chatId: string, data: any): void {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'nextAgent',
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming nextAgent event:', error)
        }
    }

    streamActionEvent(chatId: string, data: any): void {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'action',
                    data
                })
            )
        } catch (error) {
            console.error('Error streaming action event:', error)
        }
    }

    streamAbortEvent(chatId: string): void {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'abort',
                    data: '[DONE]'
                })
            )
        } catch (error) {
            console.error('Error streaming abort event:', error)
        }
    }

    streamEndEvent(_: string) {
        // placeholder for future use
    }

    streamErrorEvent(chatId: string, msg: string) {
        try {
            this.redisPublisher.publish(
                chatId,
                JSON.stringify({
                    chatId,
                    eventType: 'error',
                    data: msg
                })
            )
        } catch (error) {
            console.error('Error streaming error event:', error)
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

    async disconnect() {
        if (this.redisPublisher) {
            await this.redisPublisher.quit()
        }
    }
}
