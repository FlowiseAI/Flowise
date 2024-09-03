import { Request, Response, NextFunction } from 'express'
import { utilBuildChatflow } from '../../utils/buildChatflow'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

// Send input message and get prediction result (Internal)
const createInternalPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.body.streaming || req.body.streaming === 'true') {
            createAndStreamInternalPrediction(req, res, next)
            return
        } else {
            const apiResponse = await utilBuildChatflow(req, true)
            return res.json(apiResponse)
        }
    } catch (error) {
        next(error)
    }
}

// Send input message and stream prediction result using SSE (Internal)
const createAndStreamInternalPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatId = req.body.chatId
        getRunningExpressApp().sseStreamer.addClient(chatId, res)
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders()

        const apiResponse = await utilBuildChatflow(req, true)
        const sseStreamer = getRunningExpressApp().sseStreamer
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
        sseStreamer.streamCustomEvent(apiResponse.chatId, 'metadata', metadataJson)
        sseStreamer.removeClient(apiResponse.chatId)
        return
    } catch (error) {
        next(error)
    }
}
export default {
    createInternalPrediction
}
