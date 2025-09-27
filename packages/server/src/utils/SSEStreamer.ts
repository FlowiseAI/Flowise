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
    clients: { [id: string]: Client } = {}

    addExternalClient(chatId: string, res: Response) {
        this.clients[chatId] = { clientType: 'EXTERNAL', response: res, started: false }
    }

    addClient(chatId: string, res: Response) {
        this.clients[chatId] = { clientType: 'INTERNAL', response: res, started: false }
    }

    removeClient(chatId: string) {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'end',
                data: '[DONE]'
            }
            client.response.write('message\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            client.response.end()
            delete this.clients[chatId]
        }
    }

    streamCustomEvent(chatId: string, eventType: string, data: any) {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: eventType,
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }

    streamStartEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        // prevent multiple start events being streamed to the client
        if (client && !client.started) {
            const clientResponse = {
                event: 'start',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            client.started = true
        }
    }

    streamTokenEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'token',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }

    streamSourceDocumentsEvent(chatId: string, data: any) {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'sourceDocuments',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamArtifactsEvent(chatId: string, data: any) {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'artifacts',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamUsedToolsEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'usedTools',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamCalledToolsEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'calledTools',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamFileAnnotationsEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'fileAnnotations',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamToolEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'tool',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamAgentReasoningEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'agentReasoning',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamNextAgentEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'nextAgent',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamAgentFlowEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'agentFlowEvent',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamAgentFlowExecutedDataEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'agentFlowExecutedData',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamNextAgentFlowEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'nextAgentFlow',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }
    streamActionEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'action',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }

    streamAbortEvent(chatId: string): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'abort',
                data: '[DONE]'
            }
            client.response.write('message\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }

    streamEndEvent(_: string) {
        // placeholder for future use
    }

    streamErrorEvent(chatId: string, msg: string) {
        if (msg.includes('401 Incorrect API key provided')) msg = '401 Invalid model key or Incorrect local model configuration.'
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'error',
                data: msg
            }
            client.response.write('message\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
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
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'usageMetadata',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }

    streamTTSStartEvent(chatId: string, chatMessageId: string, format: string): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'tts_start',
                data: { chatMessageId, format }
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }

    streamTTSDataEvent(chatId: string, chatMessageId: string, audioChunk: string): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'tts_data',
                data: { chatMessageId, audioChunk }
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }

    streamTTSEndEvent(chatId: string, chatMessageId: string): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'tts_end',
                data: { chatMessageId }
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }

    streamTTSAbortEvent(chatId: string, chatMessageId: string): void {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'tts_abort',
                data: { chatMessageId }
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            client.response.end()
            delete this.clients[chatId]
        }
    }
}
