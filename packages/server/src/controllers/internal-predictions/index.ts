import { Request, Response, NextFunction } from 'express'
import { buildNewflow } from '../../utils/buildNewflow'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { getErrorMessage } from '../../errors/utils'
import { MODE } from '../../Interface'
import { v4 as uuidv4 } from 'uuid'

// Send input message and get prediction result (Internal)
const createInternalPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.body.streaming || req.body.streaming === 'true') {
            createAndStreamInternalPrediction(req, res, next)
            return
        } else {
            const result = await buildNewflow(req, true)
            if (result) {
                return res.json({
                    text: result.finalResult?.text || '',
                    status: result.status,
                    executionTime: result.executionTime,
                    tokenCount: result.tokenCount,
                    results: result.results,
                    chatId: result.chatId
                })
            }
        }
    } catch (error) {
        next(error)
    }
}

// Send input message and stream prediction result using SSE (Internal)
const createAndStreamInternalPrediction = async (req: Request, res: Response, next: NextFunction) => {
    let chatId = req.body.chatId
    if (!chatId) {
        chatId = req.body.chatId ?? req.body.overrideConfig?.sessionId ?? uuidv4()
        req.body.chatId = chatId
    }
    const sseStreamer = getRunningExpressApp().sseStreamer

    try {
        sseStreamer.addClient(chatId, res)
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no') //nginx config: https://serverfault.com/a/801629
        res.flushHeaders()

        if (process.env.MODE === MODE.QUEUE) {
            getRunningExpressApp().redisSubscriber.subscribe(chatId)
        }

        const result = await buildNewflow(req, true)
        if (result) {
            const responseData = {
                text: result.finalResult?.text || '',
                status: result.status,
                executionTime: result.executionTime,
                tokenCount: result.tokenCount,
                results: result.results,
                chatId: result.chatId || chatId
            }
            sseStreamer.streamMetadataEvent(chatId, responseData)
        }
    } catch (error) {
        if (chatId) {
            sseStreamer.streamErrorEvent(chatId, getErrorMessage(error))
        }
        next(error)
    } finally {
        if (chatId) {
            sseStreamer.removeClient(chatId)
        }
    }
}

export default {
    createInternalPrediction
}
