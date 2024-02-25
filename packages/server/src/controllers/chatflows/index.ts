import { Request, Response, NextFunction } from 'express'
import { IChatFlow } from '../../Interface'
import apiKeysService from '../../services/apikeys'
import chatflowsService from '../../services/chatflows'
import telemetryService from '../../services/telemetry'
import { getAppVersion, getTelemetryFlowObj } from '../../utils'

// Check if chatflow valid for streaming
const chatflowValidForStreaming = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: chatflowsController.chatflowValidForStreaming - id not provided!')
        }
        const apiResponse = await chatflowsService.chatflowValidForStreaming(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Save chatflow
const createChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new Error(`Error: chatflowsController.createChatflow - body not provided!`)
        }
        const apiResponse = await chatflowsService.createChatflow(req.body)
        await telemetryService.createEvent({
            name: `chatflow_created`,
            data: {
                version: await getAppVersion(),
                chatflowId: apiResponse.id,
                flowGraph: getTelemetryFlowObj(JSON.parse(apiResponse.flowData)?.nodes, JSON.parse(apiResponse.flowData)?.edges)
            }
        })
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Configure number of proxies in Host Environment
const getAllChatflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse: IChatFlow[] = await chatflowsService.getAllChatFlows()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific chatflow via api key
const getSingleChatflowByApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.apiKey === 'undefined' || req.params.apiKey === '') {
            throw new Error('Error: chatflowsController.getSingleChatflowByApiKey - apiKey not provided!')
        }
        const apiKey = await apiKeysService.getSingleApiKey(req.params.apiKey)
        if (!apiKey) {
            return res.status(401).send('Unauthorized')
        }
        const apiResponse = await chatflowsService.getSingleChatflowByApiKey(apiKey)
        //@ts-ignore
        if (typeof apiResponse.status !== 'undefined' && typeof apiResponse.msg !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.status(200).send(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific chatflow via id
const getSingleChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: chatflowsController.getSingleChatflow - id not provided!')
        }
        const apiResponse = await chatflowsService.getSingleChatflow(req.params.id)
        //@ts-ignore
        if (typeof apiResponse.status !== 'undefined' && typeof apiResponse.msg !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific chatflow via id (PUBLIC endpoint, used when sharing chatbot link)
const getSinglePublicChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: chatflowsController.getSinglePublicChatflow - id not provided!')
        }
        const apiResponse = await chatflowsService.getSingleChatflow(req.params.id)
        //@ts-ignore
        if (typeof apiResponse.status !== 'undefined' && typeof apiResponse.msg !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        //@ts-ignore
        if (apiResponse && apiResponse.isPublic) {
            return res.json(apiResponse)
            //@ts-ignore
        } else if (apiResponse && !apiResponse.isPublic) {
            return res.status(401).send(`Error: chatflowsController.getSinglePublicChatflow - Unauthorized`)
        }
    } catch (error) {
        next(error)
    }
}

// Get specific chatflow chatbotConfig via id (PUBLIC endpoint, used to retrieve config for embedded chat)
// Safe as public endpoint as chatbotConfig doesn't contain sensitive credential
const getSinglePublicChatbotConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: chatflowsController.getSinglePublicChatbotConfig - id not provided!')
        }
        const apiResponse = await chatflowsService.getSingleChatflow(req.params.id)
        //@ts-ignore
        if (typeof apiResponse.status !== 'undefined' && typeof apiResponse.msg !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        //@ts-ignore
        if (apiResponse.chatbotConfig) {
            try {
                //@ts-ignore
                const parsedConfig = JSON.parse(apiResponse.chatbotConfig)
                return res.json(parsedConfig)
            } catch (e) {
                return res.status(500).send(`Error parsing Chatbot Config for Chatflow ${req.params.id}`)
            }
        }
        return res.status(200).send('OK')
    } catch (error) {
        next(error)
    }
}

// Delete chatflow via id
const removeSingleChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: chatflowsController.removeSingleChatflow - id not provided!')
        }
        const apiResponse = await chatflowsService.removeSingleChatflow(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Update chatflow
const updateChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: chatflowsController.updateChatflow - id not provided!')
        }
        if (typeof req.body === 'undefined') {
            throw new Error('Error: chatflowsController.updateChatflow - body not provided!')
        }
        const apiResponse = await chatflowsService.updateChatflow(req.params.id, req.body)
        //@ts-ignore
        if (typeof apiResponse.executionError !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    chatflowValidForStreaming,
    createChatflow,
    getAllChatflows,
    getSingleChatflowByApiKey,
    getSingleChatflow,
    getSinglePublicChatflow,
    getSinglePublicChatbotConfig,
    removeSingleChatflow,
    updateChatflow
}
