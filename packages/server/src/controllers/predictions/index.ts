import { Request, Response, NextFunction } from 'express'
import { getRateLimiter } from '../../utils/rateLimit'
import chatflowsService from '../../services/chatflows'
import logger from '../../utils/logger'
import predictionsServices from '../../services/predictions'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

// Send input message and get prediction result (External)
const createPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: predictionsController.createPrediction - id not provided!`
            )
        }
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: predictionsController.createPrediction - body not provided!`
            )
        }
        const chatflow = await chatflowsService.getChatflowById(req.params.id)
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${req.params.id} not found`)
        }
        let isDomainAllowed = true
        logger.info(`[server]: Request originated from ${req.headers.origin || 'UNKNOWN ORIGIN'}`)
        if (chatflow.chatbotConfig) {
            const parsedConfig = JSON.parse(chatflow.chatbotConfig)
            // check whether the first one is not empty. if it is empty that means the user set a value and then removed it.
            const isValidAllowedOrigins = parsedConfig.allowedOrigins?.length && parsedConfig.allowedOrigins[0] !== ''
            if (isValidAllowedOrigins && req.headers.origin) {
                const originHeader = req.headers.origin
                const origin = new URL(originHeader).host
                isDomainAllowed =
                    parsedConfig.allowedOrigins.filter((domain: string) => {
                        try {
                            const allowedOrigin = new URL(domain).host
                            return origin === allowedOrigin
                        } catch (e) {
                            return false
                        }
                    }).length > 0
            }
        }
        if (isDomainAllowed) {
            const streamable = await chatflowsService.checkIfChatflowIsValidForStreaming(req.params.id)
            if (streamable?.isStreaming && req.body.streaming === 'true') {
                res.setHeader('Content-Type', 'text/event-stream')
                res.setHeader('Cache-Control', 'no-cache')
                res.setHeader('Connection', 'keep-alive')
                res.flushHeaders()
                const chatId = req.body.chatId
                getRunningExpressApp().sseStreamer.addExternalClient(chatId, res)
            }

            //@ts-ignore
            const apiResponse = await predictionsServices.buildChatflow(req)
            if (streamable?.isStreaming && req.body.streaming === 'true') {
                const sseStreamer = getRunningExpressApp().sseStreamer
                const metadataJson: any = {}
                if (apiResponse.chatId) {
                    metadataJson['chatId'] = apiResponse.chatId
                    //sseStreamer.streamCustomEvent(apiResponse.chatId, 'chatId', apiResponse.chatId)
                }
                if (apiResponse.chatMessageId) {
                    metadataJson['chatMessageId'] = apiResponse.chatMessageId
                    //sseStreamer.streamCustomEvent(apiResponse.chatId, 'chatMessageId', apiResponse.chatMessageId)
                }
                if (apiResponse.question) {
                    metadataJson['question'] = apiResponse.question
                    //sseStreamer.streamCustomEvent(apiResponse.chatId, 'question', apiResponse.question)
                }
                if (apiResponse.sessionId) {
                    metadataJson['sessionId'] = apiResponse.sessionId
                    //sseStreamer.streamCustomEvent(apiResponse.chatId, 'sessionId', apiResponse.sessionId)
                }
                if (apiResponse.memoryType) {
                    metadataJson['memoryType'] = apiResponse.memoryType
                    //sseStreamer.streamCustomEvent(apiResponse.chatId, 'memoryType', apiResponse.memoryType)
                }
                sseStreamer.streamCustomEvent(apiResponse.chatId, 'metadata', JSON.stringify(metadataJson))
                sseStreamer.removeClient(apiResponse.chatId)
                return
            }
            return res.json(apiResponse)
        } else {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `This site is not allowed to access this chatbot`)
        }
    } catch (error) {
        next(error)
    }
}

const getRateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return getRateLimiter(req, res, next)
    } catch (error) {
        next(error)
    }
}

export default {
    createPrediction,
    getRateLimiterMiddleware
}
