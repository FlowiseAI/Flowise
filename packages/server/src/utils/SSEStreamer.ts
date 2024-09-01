import express from 'express'
import { Request, Response } from 'express'
import { IServerSideEventStreamer } from 'flowise-components'

import multer from 'multer'
import path from 'path'

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
        console.log('SSEStreamer constructor')
    }

    addExternalClient(chatId: string, res: Response) {
        this.clients[chatId] = { clientType: 'EXTERNAL', response: res, abort: false }
    }

    addClient(chatId: string, res: Response) {
        this.clients[chatId] = { clientType: 'INTERNAL', response: res, abort: false }
    }

    removeClient(chatId: string) {
        const client = this.clients[chatId]
        console.log('Removing client', chatId)
        if (client) {
            if (client.clientType === 'INTERNAL') {
                client.response.write(`event: end\ndata: [DONE]\n\n`)
            }
            if (client.clientType === 'EXTERNAL') {
                const clientResponse = {
                    event: 'end',
                    data: '[DONE]'
                }
                client.response.write('message\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            }
            client.response.end()
            delete this.clients[chatId]
        }
    }

    // TODO: remove the /api/v1 prefix from the endpoints
    setupSSEEndpoint = () => {
        // this.app.post(
        //     '/api/v1/prediction/:id',
        //     upload.array('files'),
        //     predictionsController.getRateLimiterMiddleware,
        //     async (req: Request, res: Response, next: NextFunction) => {
        //         const streamable = await chatflowsService.checkIfChatflowIsValidForStreaming(req.params.id)
        //         if (streamable?.isStreaming && req.body.streaming === 'true') {
        //             res.setHeader('Content-Type', 'text/event-stream')
        //             res.setHeader('Cache-Control', 'no-cache')
        //             res.setHeader('Connection', 'keep-alive')
        //             res.flushHeaders()
        //             const chatId = req.body.chatId
        //             this.clients[chatId] = { clientType: 'EXTERNAL', response: res }
        //         }
        //
        //         await predictionsController.createPrediction(req, res, next)
        //         if (streamable?.isStreaming && req.body.streaming === 'true') {
        //             const chatId = req.body.chatId
        //             req.on('close', () => {
        //                 delete this.clients[chatId]
        //             })
        //         }
        //     }
        // )

        this.app.get('/api/v1/events/:chatId', (req: Request, res: Response) => {
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')
            res.flushHeaders()

            const chatId = req.params.chatId
            this.clients[chatId] = { clientType: 'INTERNAL', response: res, abort: false }

            // req.on('close', () => {
            //     console.log('req.onClose ', chatId, this.clients[chatId])
            //     //delete this.clients[chatId]
            // })
        })
    }

    // Send SSE message to a specific client
    streamEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: start\ndata: ${data}\n\n'`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: 'start',
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
        // if (data === '[DONE]') {
        //     delete this.clients[chatId]
        // }
    }

    streamCustomEvent(chatId: string, eventType: string, data: string) {
        console.log('streamCustomEvent ', eventType, chatId)
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: ${eventType}\ndata: ${data}\n\n`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: eventType,
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
    }

    streamStartEvent(chatId: string, data: string) {
        console.log('streamStartEvent ', chatId)
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: start\ndata: ${data} \n\n'`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: 'start',
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
        // if (data === '[DONE]') {
        //     delete this.clients[chatId]
        // }
    }

    streamTokenEvent(chatId: string, data: string) {
        console.log('streamTokenEvent ', chatId)
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: token\ndata: ${data}\n\n`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: 'token',
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
        // if (data === '[DONE]') {
        //     delete this.clients[chatId]
        // }
    }

    streamSourceDocumentsEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: sourceDocuments\ndata: ${data}\n\n`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: 'sourceDocuments',
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
        // if (data === '[DONE]') {
        //     delete this.clients[chatId]
        // }
    }
    streamUsedToolsEvent(chatId: string, data: string): void {
        console.log('streamUsedToolsEvent ', chatId)
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: usedTools\ndata: ${data}\n\n`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: 'usedTools',
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
        // if (data === '[DONE]') {
        //     delete this.clients[chatId]
        // }
    }
    streamFileAnnotationsEvent(chatId: string, data: string): void {
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: fileAnnotations\ndata: ${data}\n\n`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: 'fileAnnotations',
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
        // if (data === '[DONE]') {
        //     delete this.clients[chatId]
        // }
    }
    streamToolEvent(chatId: string, data: string): void {
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: tool\ndata: ${data}\n\n`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: 'tool',
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
        // if (data === '[DONE]') {
        //     delete this.clients[chatId]
        // }
    }
    streamAgentReasoningEvent(chatId: string, data: string): void {
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: agentReasoning\ndata: ${data}\n\n`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: 'agentReasoning',
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
        // if (data === '[DONE]') {
        //     delete this.clients[chatId]
        // }
    }
    streamNextAgentEvent(chatId: string, data: string): void {
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: nextAgent\ndata: ${data}\n\n`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: 'nextAgent',
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
        // if (data === '[DONE]') {
        //     delete this.clients[chatId]
        // }
    }
    streamActionEvent(chatId: string, data: string): void {
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: action\ndata: ${data}\n\n`)
        }
        if (client && client.clientType === 'EXTERNAL') {
            const clientResponse = {
                event: 'action',
                data
            }
            client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
        }
        // if (data === '[DONE]') {
        //     delete this.clients[chatId]
        // }
    }

    streamAbortEvent(chatId: string): void {
        console.log('streamAbortEvent ', chatId)
        const client = this.clients[chatId]
        if (client && client.clientType === 'INTERNAL') {
            client.response.write(`event: abort\ndata: [ABORT]\n\n`)
        }
        if (client && client.clientType === 'EXTERNAL') {
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
