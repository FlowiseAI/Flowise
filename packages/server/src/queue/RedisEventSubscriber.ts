import { createClient } from 'redis'
import { SSEStreamer } from '../utils/SSEStreamer'

export class RedisEventSubscriber {
    private redisSubscriber: ReturnType<typeof createClient>
    private sseStreamer: SSEStreamer
    private subscribedChannels: Set<string> = new Set()

    constructor(sseStreamer: SSEStreamer) {
        this.redisSubscriber = createClient()
        this.sseStreamer = sseStreamer
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
        const { eventType, chatId, data } = event

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
        }
    }

    async disconnect() {
        if (this.redisSubscriber) {
            await this.redisSubscriber.quit()
        }
    }
}
