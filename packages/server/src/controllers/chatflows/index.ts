import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import apiKeyService from '../../services/apikey'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { updateRateLimiter } from '../../utils/rateLimit'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { ChatflowType } from '../../Interface'
import chatflowsService from '../../services/chatflows'

const checkIfChatflowIsValidForStreaming = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsRouter.checkIfChatflowIsValidForStreaming - id not provided!`
            )
        }
        const apiResponse = await chatflowsService.checkIfChatflowIsValidForStreaming(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const checkIfChatflowIsValidForUploads = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsRouter.checkIfChatflowIsValidForUploads - id not provided!`
            )
        }
        const apiResponse = await chatflowsService.checkIfChatflowIsValidForUploads(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.deleteChatflow - id not provided!`)
        }
        const apiResponse = await chatflowsService.deleteChatflow(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllChatflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await chatflowsService.getAllChatflows(req.query?.type as ChatflowType)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific chatflow via api key
const getChatflowByApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.apikey) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsRouter.getChatflowByApiKey - apikey not provided!`
            )
        }
        const apikey = await apiKeyService.getApiKey(req.params.apikey)
        if (!apikey) {
            return res.status(401).send('Unauthorized')
        }
        const apiResponse = await chatflowsService.getChatflowByApiKey(apikey.id, req.query.keyonly)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getChatflowById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.getChatflowById - id not provided!`)
        }
        const apiResponse = await chatflowsService.getChatflowById(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const saveChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.saveChatflow - body not provided!`)
        }
        const body = req.body
        const newChatFlow = new ChatFlow()
        Object.assign(newChatFlow, body)
        const apiResponse = await chatflowsService.saveChatflow(newChatFlow)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const importChatflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflows: Partial<ChatFlow>[] = req.body.Chatflows
        const apiResponse = await chatflowsService.importChatflows(chatflows)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.updateChatflow - id not provided!`)
        }
        const chatflow = await chatflowsService.getChatflowById(req.params.id)
        if (!chatflow) {
            return res.status(404).send(`Chatflow ${req.params.id} not found`)
        }

        const body = req.body
        const updateChatFlow = new ChatFlow()
        Object.assign(updateChatFlow, body)

        updateChatFlow.id = chatflow.id
        updateRateLimiter(updateChatFlow)

        const apiResponse = await chatflowsService.updateChatflow(chatflow, updateChatFlow)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getSinglePublicChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsRouter.getSinglePublicChatflow - id not provided!`
            )
        }
        const apiResponse = await chatflowsService.getSinglePublicChatflow(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getSinglePublicChatbotConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsRouter.getSinglePublicChatbotConfig - id not provided!`
            )
        }
        const apiResponse = await chatflowsService.getSinglePublicChatbotConfig(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    checkIfChatflowIsValidForStreaming,
    checkIfChatflowIsValidForUploads,
    deleteChatflow,
    getAllChatflows,
    getChatflowByApiKey,
    getChatflowById,
    saveChatflow,
    importChatflows,
    updateChatflow,
    getSinglePublicChatflow,
    getSinglePublicChatbotConfig
}
