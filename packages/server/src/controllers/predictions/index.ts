import { Request, Response, NextFunction } from 'express'
import { RateLimiterManager } from '../../utils/rateLimit'
import chatflowsService from '../../services/chatflows'
import chatflowVersionsService from '../../services/chatflow-versions'
import logger from '../../utils/logger'
import predictionsServices from '../../services/predictions'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { mergeActiveVersionData } from '../../utils/getChatflowWithActiveVersion'
import { v4 as uuidv4 } from 'uuid'
import { getErrorMessage } from '../../errors/utils'
import { MODE } from '../../Interface'
import { ChatFlow } from '../../database/entities/ChatFlow'

/**
 * Validates the origin against allowed origins in chatbot config
 */
const validateOrigin = (chatflow: ChatFlow, origin: string | undefined): { isDomainAllowed: boolean; errorMessage: string } => {
    let isDomainAllowed = true
    let errorMessage = 'This site is not allowed to access this chatbot'

    if (chatflow.chatbotConfig) {
        const parsedConfig = JSON.parse(chatflow.chatbotConfig)
        const isValidAllowedOrigins = parsedConfig.allowedOrigins?.length && parsedConfig.allowedOrigins[0] !== ''
        errorMessage = parsedConfig.allowedOriginsError || errorMessage

        if (isValidAllowedOrigins && origin) {
            const originHost = new URL(origin).host
            isDomainAllowed =
                parsedConfig.allowedOrigins.filter((domain: string) => {
                    try {
                        const allowedOrigin = new URL(domain).host
                        return originHost === allowedOrigin
                    } catch (e) {
                        return false
                    }
                }).length > 0
        }
    }

    return { isDomainAllowed, errorMessage }
}

/**
 * Handles the prediction request (streaming or non-streaming)
 */
const handlePrediction = async (req: Request, res: Response, next: NextFunction, chatflowId: string): Promise<Response | void> => {
    const streamable = await chatflowsService.checkIfChatflowIsValidForStreaming(chatflowId)
    const isStreamingRequested = req.body.streaming === 'true' || req.body.streaming === true

    if (streamable?.isStreaming && isStreamingRequested) {
        const sseStreamer = getRunningExpressApp().sseStreamer

        let chatId = req.body.chatId
        if (!req.body.chatId) {
            chatId = req.body.chatId ?? req.body.overrideConfig?.sessionId ?? uuidv4()
            req.body.chatId = chatId
        }
        try {
            sseStreamer.addExternalClient(chatId, res)
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')
            res.setHeader('X-Accel-Buffering', 'no') //nginx config: https://serverfault.com/a/801629
            res.flushHeaders()

            if (process.env.MODE === MODE.QUEUE) {
                getRunningExpressApp().redisSubscriber.subscribe(chatId)
            }

            const apiResponse = await predictionsServices.buildChatflow(req)
            sseStreamer.streamMetadataEvent(apiResponse.chatId, apiResponse)
        } catch (error) {
            if (chatId) {
                sseStreamer.streamErrorEvent(chatId, getErrorMessage(error))
            }
            next(error)
        } finally {
            sseStreamer.removeClient(chatId)
        }
    } else {
        const apiResponse = await predictionsServices.buildChatflow(req)
        return res.json(apiResponse)
    }
}

/**
 * Handles forbidden access response
 */
const handleForbidden = (req: Request, res: Response, errorMessage: string): Response => {
    const isStreamingRequested = req.body.streaming === 'true' || req.body.streaming === true
    if (isStreamingRequested) {
        return res.status(StatusCodes.FORBIDDEN).send(errorMessage)
    }
    throw new InternalFlowiseError(StatusCodes.FORBIDDEN, errorMessage)
}

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

        const chatflowId = req.params.id
        const workspaceId = req.user?.activeWorkspaceId

        const chatflow = await chatflowsService.getChatflowById(chatflowId, workspaceId)
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        logger.info(`[server]: Request originated from ${req.headers.origin || 'UNKNOWN ORIGIN'}`)
        const { isDomainAllowed, errorMessage } = validateOrigin(chatflow, req.headers.origin)

        if (isDomainAllowed) {
            return await handlePrediction(req, res, next, chatflowId)
        } else {
            return handleForbidden(req, res, errorMessage)
        }
    } catch (error) {
        next(error)
    }
}

// Send input message and get prediction result for a specific version
const createVersionPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id || !req.params.version) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: predictionsController.createVersionPrediction - id or version not provided!`
            )
        }
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: predictionsController.createVersionPrediction - body not provided!`
            )
        }

        const chatflowId = req.params.id
        const versionNumber = parseInt(req.params.version, 10)
        const workspaceId = req.user?.activeWorkspaceId

        // Get the chatflow (for metadata like workspaceId, type, etc.)
        const chatflow = await chatflowsService.getChatflowById(chatflowId, workspaceId)
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        // Get the specific version
        const version = await chatflowVersionsService.getVersion(chatflowId, versionNumber, workspaceId || chatflow.workspaceId)
        if (!version) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Version ${versionNumber} not found for chatflow ${chatflowId}`)
        }

        // Merge version data into chatflow for prediction
        mergeActiveVersionData(chatflow, version)

        // Store the merged chatflow in request for buildChatflow to use
        ;(req as any).versionedChatflow = chatflow

        logger.info(`[server]: Request originated from ${req.headers.origin || 'UNKNOWN ORIGIN'}`)
        const { isDomainAllowed, errorMessage } = validateOrigin(chatflow, req.headers.origin)

        if (isDomainAllowed) {
            return await handlePrediction(req, res, next, chatflowId)
        } else {
            return handleForbidden(req, res, errorMessage)
        }
    } catch (error) {
        next(error)
    }
}

const getRateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return RateLimiterManager.getInstance().getRateLimiter()(req, res, next)
    } catch (error) {
        next(error)
    }
}

export default {
    createPrediction,
    createVersionPrediction,
    getRateLimiterMiddleware
}
