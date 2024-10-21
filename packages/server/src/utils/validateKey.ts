import { Request } from 'express'
import { ChatFlow } from '../database/entities/ChatFlow'
import { compareKeys } from './apiKey'
import apikeyService from '../services/apikey'

/**
 * Validate Chatflow API Key
 * @param {Request} req
 * @param {ChatFlow} chatflow
 */
export const validateChatflowAPIKey = async (req: Request, chatflow: ChatFlow) => {
    const chatFlowApiKeyId = chatflow?.apikeyid
    if (!chatFlowApiKeyId) return true

    const authorizationHeader = (req.headers['Authorization'] as string) ?? (req.headers['authorization'] as string) ?? ''
    if (chatFlowApiKeyId && !authorizationHeader) return false

    const suppliedKey = authorizationHeader.split(`Bearer `).pop()
    if (suppliedKey) {
        const keys = await apikeyService.getAllApiKeys()
        const apiSecret = keys.find((key: any) => key.id === chatFlowApiKeyId)?.apiSecret
        if (!compareKeys(apiSecret, suppliedKey)) return false
        return true
    }
    return false
}

/**
 * Validate API Key
 * @param {Request} req
 */
export const validateAPIKey = async (req: Request) => {
    const authorizationHeader = (req.headers['Authorization'] as string) ?? (req.headers['authorization'] as string) ?? ''
    if (!authorizationHeader) return false

    const suppliedKey = authorizationHeader.split(`Bearer `).pop()
    if (suppliedKey) {
        const keys = await apikeyService.getAllApiKeys()
        const apiSecret = keys.find((key: any) => key.apiKey === suppliedKey)?.apiSecret
        if (!apiSecret) return false
        if (!compareKeys(apiSecret, suppliedKey)) return false
        return true
    }
    return false
}
