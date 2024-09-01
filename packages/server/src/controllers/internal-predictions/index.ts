import { Request, Response, NextFunction } from 'express'
import { utilBuildChatflow } from '../../utils/buildChatflow'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

// Send input message and get prediction result (Internal)
const createInternalPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatId = req.params.chatId
        //getRunningExpressApp().sseStreamer.addClient(chatId, res)

        const apiResponse = await utilBuildChatflow(req, true)
        if (apiResponse.isStreamValid) {
            const sseStreamer = getRunningExpressApp().sseStreamer
            if (apiResponse.chatId) {
                sseStreamer.streamCustomEvent(apiResponse.chatId, 'chatId', apiResponse.chatId)
            }
            if (apiResponse.chatMessageId) {
                sseStreamer.streamCustomEvent(apiResponse.chatId, 'chatMessageId', apiResponse.chatMessageId)
            }
            if (apiResponse.question) {
                sseStreamer.streamCustomEvent(apiResponse.chatId, 'question', apiResponse.question)
            }
            if (apiResponse.sessionId) {
                sseStreamer.streamCustomEvent(apiResponse.chatId, 'sessionId', apiResponse.sessionId)
            }
            if (apiResponse.memoryType) {
                sseStreamer.streamCustomEvent(apiResponse.chatId, 'memoryType', apiResponse.memoryType)
            }
            sseStreamer.removeClient(apiResponse.chatId)
        }

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}
export default {
    createInternalPrediction
}
