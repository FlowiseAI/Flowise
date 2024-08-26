import express from 'express'
import { Request, Response } from 'express'
import { IServerSideEventStreamer } from 'flowise-components'

export class SSEStreamer implements IServerSideEventStreamer {
    clients: { [id: string]: Response } = {}
    app: express.Application

    constructor(app: express.Application) {
        this.app = app
    }

    // Setup SSE endpoint
    setupSSEEndpoint = () => {
        this.app.get('/api/v1/events/:chatId', (req: Request, res: Response) => {
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')
            res.flushHeaders()

            const chatId = req.params.chatId
            this.clients[chatId] = res

            req.on('close', () => {
                delete this.clients[chatId]
            })
        })
    }

    // Send SSE message to a specific client
    streamEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        if (client) {
            client.write(`${data}`)
        }
        if (data === '[END]') {
            delete this.clients[chatId]
        }
    } // Send SSE message to a specific client

    streamStartEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        if (client) {
            client.write(`event: start\ndata: ${data} \n\n'`)
        }
        if (data === '[END]') {
            delete this.clients[chatId]
        }
    }

    streamTokenEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        if (client) {
            client.write(`event: token\ndata: ${data} \n\n`)
        }
        if (data === '[END]') {
            delete this.clients[chatId]
        }
    }

    streamSourceDocumentsEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        if (client) {
            client.write(`event: sourceDocuments\ndata: ${data} \n\n`)
        }
        if (data === '[END]') {
            delete this.clients[chatId]
        }
    }

    streamEndEvent(chatId: string) {
        const client = this.clients[chatId]
        if (client) {
            client.write(`'event: sourceDocuments\ndata: [END] \n\n'`)
        }
        delete this.clients[chatId]
    }
}
