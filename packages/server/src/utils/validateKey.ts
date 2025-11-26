import { Request } from 'express'
import { ChatFlow } from '../database/entities/ChatFlow'
import { ApiKey } from '../database/entities/ApiKey'
import { compareKeys } from './apiKey'
import apikeyService from '../services/apikey'

/**
 * Validate flow API Key, this is needed because Prediction/Upsert API is public
 * @param {Request} req
 * @param {ChatFlow} chatflow
 */
export const validateFlowAPIKey = async (req: Request, chatflow: ChatFlow): Promise<boolean> => {
    const chatFlowApiKeyId = chatflow?.apikeyid
    if (!chatFlowApiKeyId) return true

    const authorizationHeader = (req.headers['Authorization'] as string) ?? (req.headers['authorization'] as string) ?? ''
    if (chatFlowApiKeyId && !authorizationHeader) return false

    const suppliedKey = authorizationHeader.split(`Bearer `).pop()
    if (!suppliedKey) return false

    try {
        const apiKey = await apikeyService.getApiKeyById(chatFlowApiKeyId)
        if (!apiKey) return false

        const apiKeyWorkSpaceId = apiKey.workspaceId
        if (!apiKeyWorkSpaceId) return false

        if (apiKeyWorkSpaceId !== chatflow.workspaceId) return false

        const apiSecret = apiKey.apiSecret
        if (!apiSecret || !compareKeys(apiSecret, suppliedKey)) return false

        return true
    } catch (error) {
        return false
    }
}

/**
 * Validate and Get API Key Information
 * @param {Request} req
 * @returns {Promise<{isValid: boolean, apiKey?: ApiKey, workspaceId?: string}>}
 */
export const validateAPIKey = async (req: Request): Promise<{ isValid: boolean; apiKey?: ApiKey; workspaceId?: string }> => {
    const authorizationHeader = (req.headers['Authorization'] as string) ?? (req.headers['authorization'] as string) ?? ''
    if (!authorizationHeader) return { isValid: false }

    const suppliedKey = authorizationHeader.split(`Bearer `).pop()
    if (!suppliedKey) return { isValid: false }

    try {
        const apiKey = await apikeyService.getApiKey(suppliedKey)
        if (!apiKey) return { isValid: false }

        const apiKeyWorkSpaceId = apiKey.workspaceId
        if (!apiKeyWorkSpaceId) return { isValid: false }

        const apiSecret = apiKey.apiSecret
        if (!apiSecret || !compareKeys(apiSecret, suppliedKey)) {
            return { isValid: false, apiKey, workspaceId: apiKey.workspaceId }
        }

        return { isValid: true, apiKey, workspaceId: apiKey.workspaceId }
    } catch (error) {
        return { isValid: false }
    }
}
