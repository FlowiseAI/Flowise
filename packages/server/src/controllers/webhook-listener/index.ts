import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { getWebhookListenerRegistry } from '../../services/webhook-listener'
import { IReactFlowObject } from '../../Interface'
import chatflowsService from '../../services/chatflows'
import logger from '../../utils/logger'

const HEARTBEAT_MS = 30_000

const assertChatflowIsWebhookTriggered = async (chatflowid: string, workspaceId?: string) => {
    const chatflow = await chatflowsService.getChatflowById(chatflowid, workspaceId)
    if (!chatflow) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
    }
    const parsedFlowData: IReactFlowObject = JSON.parse(chatflow.flowData)
    const startNode = parsedFlowData.nodes.find((node) => node.data.name === 'startAgentflow')
    if (startNode?.data?.inputs?.startInputType !== 'webhookTrigger') {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Chatflow ${chatflowid} is not configured as a webhook trigger`)
    }
}

const registerListener = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflowid = req.params.id
        if (!chatflowid) throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'chatflow id is required')

        await assertChatflowIsWebhookTriggered(chatflowid, req.user?.activeWorkspaceId)

        const registry = getWebhookListenerRegistry()
        const listenerId = await registry.register(chatflowid)
        return res.json({ listenerId })
    } catch (error) {
        next(error)
    }
}

const streamListener = async (req: Request, res: Response, next: NextFunction) => {
    const chatflowid = req.params.id
    const listenerId = req.params.listenerId

    try {
        if (!chatflowid || !listenerId) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'chatflow id and listener id are required')
        }

        await assertChatflowIsWebhookTriggered(chatflowid, req.user?.activeWorkspaceId)

        const sseStreamer = getRunningExpressApp().sseStreamer
        const registry = getWebhookListenerRegistry()

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()

        sseStreamer.addClient(listenerId, res)

        try {
            await registry.heartbeat(chatflowid, listenerId)
        } catch (err) {
            logger.warn(`[webhookListener] Initial heartbeat failed for ${listenerId}: ${err}`)
        }

        // Initial "ready" beacon so the UI can flip from "connecting…" to "listening".
        res.write(
            'message:\ndata:' +
                JSON.stringify({ event: 'listenerReady', data: { listenerId, replicaId: registry.getReplicaId() } }) +
                '\n\n'
        )

        // Heartbeat both keeps the SSE connection alive through proxies AND refreshes the
        // registry TTL so the listener stays discoverable to incoming webhooks.
        const heartbeat = setInterval(() => {
            try {
                res.write(':heartbeat\n\n')
                registry.heartbeat(chatflowid, listenerId).catch(() => {})
            } catch {
                /* connection already torn down */
            }
        }, HEARTBEAT_MS)

        req.on('close', async () => {
            clearInterval(heartbeat)
            sseStreamer.removeClient(listenerId)
            try {
                await registry.unregister(chatflowid, listenerId)
            } catch (err) {
                logger.warn(`[webhookListener] Failed to unregister ${listenerId}: ${err}`)
            }
        })
    } catch (error) {
        next(error)
    }
}

const unregisterListener = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflowid = req.params.id
        const listenerId = req.params.listenerId
        if (!chatflowid || !listenerId) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'chatflow id and listener id are required')
        }
        const registry = getWebhookListenerRegistry()
        await registry.unregister(chatflowid, listenerId)
        return res.json({ ok: true })
    } catch (error) {
        next(error)
    }
}

export default { registerListener, streamListener, unregisterListener }
