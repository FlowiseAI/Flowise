import { isValidUUID } from 'flowise-components'
import chatflowsService from '../services/chatflows'
import logger from './logger'

/**
 * Validates if the origin is allowed for a specific chatflow
 * @param chatflowId - The chatflow ID to validate against
 * @param origin - The origin URL to validate
 * @param workspaceId - Optional workspace ID for enterprise features
 * @returns Promise<boolean> - True if domain is allowed, false otherwise
 */
async function validateChatflowDomain(chatflowId: string, origin: string, workspaceId?: string): Promise<boolean> {
    try {
        if (!chatflowId || !isValidUUID(chatflowId)) {
            throw new Error('Invalid chatflowId format - must be a valid UUID')
        }

        const chatflow = workspaceId
            ? await chatflowsService.getChatflowById(chatflowId, workspaceId)
            : await chatflowsService.getChatflowById(chatflowId)

        if (!chatflow?.chatbotConfig) {
            return true
        }

        const config = JSON.parse(chatflow.chatbotConfig)

        // If no allowed origins configured or first entry is empty, allow all
        if (!config.allowedOrigins?.length || config.allowedOrigins[0] === '') {
            return true
        }

        const originHost = new URL(origin).host
        const isAllowed = config.allowedOrigins.some((domain: string) => {
            try {
                const allowedOrigin = new URL(domain).host
                return originHost === allowedOrigin
            } catch (error) {
                logger.warn(`Invalid domain format in allowedOrigins: ${domain}`)
                return false
            }
        })

        return isAllowed
    } catch (error) {
        logger.error(`Error validating domain for chatflow ${chatflowId}:`, error)
        return false
    }
}

// NOTE: This function extracts the chatflow ID from a prediction URL.
// It assumes the URL format is /prediction/{chatflowId}.
/**
 * Extracts chatflow ID from prediction URL
 * @param url - The request URL
 * @returns string | null - The chatflow ID or null if not found
 */
function extractChatflowId(url: string): string | null {
    try {
        const urlParts = url.split('/')
        const predictionIndex = urlParts.indexOf('prediction')

        if (predictionIndex !== -1 && urlParts.length > predictionIndex + 1) {
            const chatflowId = urlParts[predictionIndex + 1]
            // Remove query parameters if present
            return chatflowId.split('?')[0]
        }

        return null
    } catch (error) {
        logger.error('Error extracting chatflow ID from URL:', error)
        return null
    }
}

/**
 * Validates if a request is a prediction request
 * @param url - The request URL
 * @returns boolean - True if it's a prediction request
 */
function isPredictionRequest(url: string): boolean {
    return url.includes('/prediction/')
}

/**
 * Get the custom error message for unauthorized origin
 * @param chatflowId - The chatflow ID
 * @param workspaceId - Optional workspace ID
 * @returns Promise<string> - Custom error message or default
 */
async function getUnauthorizedOriginError(chatflowId: string, workspaceId?: string): Promise<string> {
    try {
        const chatflow = workspaceId
            ? await chatflowsService.getChatflowById(chatflowId, workspaceId)
            : await chatflowsService.getChatflowById(chatflowId)

        if (chatflow?.chatbotConfig) {
            const config = JSON.parse(chatflow.chatbotConfig)
            return config.allowedOriginsError || 'This site is not allowed to access this chatbot'
        }

        return 'This site is not allowed to access this chatbot'
    } catch (error) {
        logger.error(`Error getting unauthorized origin error for chatflow ${chatflowId}:`, error)
        return 'This site is not allowed to access this chatbot'
    }
}

export { isPredictionRequest, extractChatflowId, validateChatflowDomain, getUnauthorizedOriginError }
