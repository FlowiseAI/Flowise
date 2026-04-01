import { Response } from 'express'
import { IServerSideEventStreamer } from 'flowise-components'

// define a new type that has a client type (INTERNAL or EXTERNAL) and Response type
type Client = {
    // future use
    clientType: 'INTERNAL' | 'EXTERNAL'
    response: Response
    // optional property with default value
    started?: boolean
}

export class SSEStreamer implements IServerSideEventStreamer {
    private readonly clients: Map<string, Client> = new Map()
    private heartbeatInterval: NodeJS.Timeout | null = null

    hasClient(chatId: string): boolean {
        return this.clients.has(chatId)
    }

    addExternalClient(chatId: string, res: Response) {
        this.clients.set(chatId, { clientType: 'EXTERNAL', response: res, started: false })
    }

    addClient(chatId: string, res: Response) {
        this.clients.set(chatId, { clientType: 'INTERNAL', response: res, started: false })
    }

    /**
     * Safely write data to a client's response. If the write fails (e.g., client already disconnected),
     * the client is automatically removed to prevent further writes to a dead connection.
     */
    private safeWrite(chatId: string, data: string): boolean {
        const client = this.clients.get(chatId)
        if (!client) return false
        try {
            client.response.write(data)
            return true
        } catch {
            this.clients.delete(chatId)
            return false
        }
    }

    removeClient(chatId: string) {
        const client = this.clients.get(chatId)
        if (client) {
            try {
                const clientResponse = {
                    event: 'end',
                    data: '[DONE]'
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
                client.response.end()
            } catch {
                // Client already disconnected, ignore write errors
            } finally {
                this.clients.delete(chatId)
            }
        }
    }

    streamCustomEvent(chatId: string, eventType: string, data: any) {
        const clientResponse = {
            event: eventType,
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }

    streamStartEvent(chatId: string, data: string) {
        const client = this.clients.get(chatId)
        // prevent multiple start events being streamed to the client
        if (client && !client.started) {
            const clientResponse = {
                event: 'start',
                data: data
            }
            if (this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')) {
                client.started = true
            }
        }
    }

    streamTokenEvent(chatId: string, data: string) {
        const clientResponse = {
            event: 'token',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }

    streamThinkingEvent(chatId: string, data: string, duration?: number) {
        const clientResponse = {
            event: 'thinking',
            data: data,
            duration: duration
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }

    streamSourceDocumentsEvent(chatId: string, data: any) {
        const clientResponse = {
            event: 'sourceDocuments',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamArtifactsEvent(chatId: string, data: any) {
        const clientResponse = {
            event: 'artifacts',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamUsedToolsEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'usedTools',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamCalledToolsEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'calledTools',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamFileAnnotationsEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'fileAnnotations',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamToolEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'tool',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamAgentReasoningEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'agentReasoning',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamNextAgentEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'nextAgent',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamAgentFlowEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'agentFlowEvent',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamAgentFlowExecutedDataEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'agentFlowExecutedData',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamNextAgentFlowEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'nextAgentFlow',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }
    streamActionEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'action',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }

    streamAbortEvent(chatId: string): void {
        const clientResponse = {
            event: 'abort',
            data: '[DONE]'
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }

    streamEndEvent(_: string) {
        // placeholder for future use
    }

    streamErrorEvent(chatId: string, msg: string) {
        if (msg.includes('401 Incorrect API key provided'))
            msg = '401 Unauthorized – check your API key and ensure it has access to the requested model.'
        const clientResponse = {
            event: 'error',
            data: msg
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }

    streamMetadataEvent(chatId: string, apiResponse: any) {
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
        if (apiResponse.followUpPrompts) {
            metadataJson['followUpPrompts'] =
                typeof apiResponse.followUpPrompts === 'string' ? JSON.parse(apiResponse.followUpPrompts) : apiResponse.followUpPrompts
        }
        if (apiResponse.flowVariables) {
            metadataJson['flowVariables'] =
                typeof apiResponse.flowVariables === 'string' ? JSON.parse(apiResponse.flowVariables) : apiResponse.flowVariables
        }
        if (Object.keys(metadataJson).length > 0) {
            this.streamCustomEvent(chatId, 'metadata', metadataJson)
        }
    }

    streamUsageMetadataEvent(chatId: string, data: any): void {
        const clientResponse = {
            event: 'usageMetadata',
            data: data
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }

    streamTTSStartEvent(chatId: string, chatMessageId: string, format: string): void {
        const clientResponse = {
            event: 'tts_start',
            data: { chatMessageId, format }
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }

    streamTTSDataEvent(chatId: string, chatMessageId: string, audioChunk: string): void {
        const clientResponse = {
            event: 'tts_data',
            data: { chatMessageId, audioChunk }
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }

    streamTTSEndEvent(chatId: string, chatMessageId: string): void {
        const clientResponse = {
            event: 'tts_end',
            data: { chatMessageId }
        }
        this.safeWrite(chatId, 'message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
    }

    streamTTSAbortEvent(chatId: string, chatMessageId: string): void {
        const client = this.clients.get(chatId)
        if (client) {
            try {
                const clientResponse = {
                    event: 'tts_abort',
                    data: { chatMessageId }
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
                client.response.end()
            } catch {
                // Client already disconnected, ignore write errors
            } finally {
                this.clients.delete(chatId)
            }
        }
    }

    startHeartbeat(intervalMs: number = 30_000) {
        this.heartbeatInterval = setInterval(() => {
            for (const chatId of this.clients.keys()) {
                // SSE comment line — ignored by clients but keeps the connection alive through ALB/proxies
                this.safeWrite(chatId, ':heartbeat\n\n')
            }
        }, intervalMs)
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
    }
}
