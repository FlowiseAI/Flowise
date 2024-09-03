import express from 'express'
import { Response } from 'express'
import { IServerSideEventStreamer } from 'flowise-components'

// define a new type that has a client type (INTERNAL or EXTERNAL) and Response type
type Client = {
    clientType: 'INTERNAL' | 'EXTERNAL'
    response: Response
    abort: boolean
}

export class SSEStreamer implements IServerSideEventStreamer {
    clients: { [id: string]: Client } = {}
    app: express.Application

    constructor(app: express.Application) {
        this.app = app
    }

    addExternalClient(chatId: string, res: Response) {
        this.clients[chatId] = { clientType: 'EXTERNAL', response: res, abort: false }
    }

    addClient(chatId: string, res: Response) {
        this.clients[chatId] = { clientType: 'INTERNAL', response: res, abort: false }
    }

    removeClient(chatId: string) {
        const client = this.clients[chatId]
        // console.log('Removing client', chatId)
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

    // Send SSE message to a specific client
    streamEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        if (client) {
            const clientResponse = {
                event: 'start',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
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
        if (client) {
            const clientResponse = {
                event: 'start',
                data: data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
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
        client.abort = true
    }

    streamEndEvent(chatId: string) {
        console.log('dummy streamEndEvent ', chatId)
        // const client = this.clients[chatId]
        // if (client && client.clientType === 'INTERNAL') {
        //     client.response.write(`event: end\ndata: [DONE] \n\n`)
        // }
        // if (client && client.clientType === 'EXTERNAL') {
        //     const clientResponse = {
        //         event: 'end',
        //         data: '[DONE]'
        //     }
        //     client.response.write('message\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        // }
    }
}
