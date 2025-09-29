import chatflowsService from '../chatflows'
import logger from '../../utils/logger'

export class DomainValidationService {
    /**
     * Validates if the origin is allowed for a specific chatflow
     * @param chatflowId - The chatflow ID to validate against
     * @param origin - The origin URL to validate
     * @param workspaceId - Optional workspace ID for enterprise features
     * @returns Promise<boolean> - True if domain is allowed, false otherwise
     */
    static async validateChatflowDomain(chatflowId: string, origin: string, workspaceId?: string): Promise<boolean> {
        try {
            const chatflow = await chatflowsService.getChatflowById(chatflowId, workspaceId)
            
            if (!chatflow?.chatbotConfig) {
                logger.info(`No chatbotConfig found for chatflow ${chatflowId}, allowing domain`)
                return true
            }
            
            const config = JSON.parse(chatflow.chatbotConfig)
            
            // If no allowed origins configured or first entry is empty, allow all
            if (!config.allowedOrigins?.length || config.allowedOrigins[0] === '') {
                logger.info(`No domain restrictions configured for chatflow ${chatflowId}`)
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
            
            logger.info(`Domain validation for ${origin} against chatflow ${chatflowId}: ${isAllowed}`)
            return isAllowed
            
        } catch (error) {
            logger.error(`Error validating domain for chatflow ${chatflowId}:`, error)
            return false
        }
    }
    
    /**
     * Extracts chatflow ID from prediction URL
     * @param url - The request URL
     * @returns string | null - The chatflow ID or null if not found
     */
    static extractChatflowId(url: string): string | null {
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
    static isPredictionRequest(url: string): boolean {
        return url.includes('/prediction/')
    }
    
    /**
     * Get the custom error message for unauthorized origin
     * @param chatflowId - The chatflow ID
     * @param workspaceId - Optional workspace ID
     * @returns Promise<string> - Custom error message or default
     */
    static async getUnauthorizedOriginError(chatflowId: string, workspaceId?: string): Promise<string> {
        try {
            const chatflow = await chatflowsService.getChatflowById(chatflowId, workspaceId)
            
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
}