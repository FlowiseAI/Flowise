import { Request, Response, NextFunction } from 'express'
import { getRateLimiter } from '../../utils/rateLimit'
import chatflowsService from '../../services/chatflows'
import logger from '../../utils/logger'
import { utilBuildChatflow } from '../../utils/buildChatflow'

// Send input message and get prediction result (External)
const createPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: predictionsController.createPrediction - id not provided!`)
        }
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error(`Error: predictionsController.createPrediction - body not provided!`)
        }
        const chatflow = await chatflowsService.getChatflowById(req.params.id)
        if (!chatflow) {
            return res.status(404).send(`Chatflow ${req.params.id} not found`)
        }
        let isDomainAllowed = true
        logger.info(`[server]: Request originated from ${req.headers.origin}`)
        if (chatflow.chatbotConfig) {
            const parsedConfig = JSON.parse(chatflow.chatbotConfig)
            // check whether the first one is not empty. if it is empty that means the user set a value and then removed it.
            const isValidAllowedOrigins = parsedConfig.allowedOrigins?.length && parsedConfig.allowedOrigins[0] !== ''
            if (isValidAllowedOrigins) {
                const originHeader = req.headers.origin as string
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
            const apiResponse = await utilBuildChatflow(req, req.io)
            if (apiResponse.executionError) {
                return res.status(apiResponse.status).send(apiResponse.msg)
            }
            return res.json(apiResponse)
        } else {
            return res.status(401).send(`This site is not allowed to access this chatbot`)
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
