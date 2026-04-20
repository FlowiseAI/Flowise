import logger from '../../utils/logger'

/**
 * Security validation utilities for WebSocket data sanitization
 * Prevents XSS attacks and ensures data integrity
 */

// Constants for validation
export const MAX_MESSAGE_SIZE = 1024 * 1024 // 1MB
export const MAX_USER_NAME_LENGTH = 100
export const MAX_SESSION_ID_LENGTH = 128
export const MAX_NODE_ID_LENGTH = 256

/**
 * Validate and sanitize a color hex code
 * @param color - Color value to validate
 * @param defaultColor - Default color to return if validation fails
 * @returns Valid hex color code
 */
export function sanitizeColor(color: string | undefined, defaultColor: string = '#000000'): string {
    if (!color) {
        return defaultColor
    }

    // Remove any whitespace
    const trimmed = color.trim()

    // Validate hex color format (#RRGGBB or #RGB)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

    if (!hexColorRegex.test(trimmed)) {
        logger.warn(`⚠️ [Validation]: Invalid color format: ${color}. Using default: ${defaultColor}`)
        return defaultColor
    }

    return trimmed.toLowerCase()
}

/**
 * Sanitize user name to prevent XSS attacks
 * @param name - User name to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized user name
 */
export function sanitizeUserName(name: string | undefined, maxLength: number = MAX_USER_NAME_LENGTH): string {
    if (!name) {
        return 'Anonymous'
    }

    // Remove any HTML tags and script content
    let sanitized = name
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]+>/g, '') // Remove all HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=

    // Trim whitespace
    sanitized = sanitized.trim()

    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength)
        logger.warn(`⚠️ [Validation]: User name truncated to ${maxLength} characters`)
    }

    // If after sanitization the name is empty, return default
    if (sanitized.length === 0) {
        logger.warn('⚠️ [Validation]: User name was empty after sanitization')
        return 'Anonymous'
    }

    return sanitized
}

/**
 * Validate session ID format
 * @param sessionId - Session ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidSessionId(sessionId: string | undefined): boolean {
    if (!sessionId) {
        return false
    }

    // Check length
    if (sessionId.length > MAX_SESSION_ID_LENGTH) {
        logger.warn(`⚠️ [Validation]: Session ID too long: ${sessionId.length} characters`)
        return false
    }

    // Session IDs should be alphanumeric with optional dashes and underscores
    const sessionIdRegex = /^[a-zA-Z0-9_-]+$/

    if (!sessionIdRegex.test(sessionId)) {
        logger.warn('⚠️ [Validation]: Session ID contains invalid characters')
        return false
    }

    return true
}

/**
 * Validate chatflow ID format
 * @param chatflowId - Chatflow ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidChatflowId(chatflowId: string | undefined): boolean {
    if (!chatflowId) {
        return false
    }

    // UUID format check (common for chatflow IDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!uuidRegex.test(chatflowId)) {
        logger.warn(`⚠️ [Validation]: Invalid chatflow ID format: ${chatflowId}`)
        return false
    }

    return true
}

/**
 * Validate node ID format
 * @param nodeId - Node ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidNodeId(nodeId: string | undefined): boolean {
    if (!nodeId) {
        return false
    }

    // Check length
    if (nodeId.length > MAX_NODE_ID_LENGTH) {
        logger.warn(`⚠️ [Validation]: Node ID too long: ${nodeId.length} characters`)
        return false
    }

    // Node IDs should be alphanumeric with optional dashes and underscores
    const nodeIdRegex = /^[a-zA-Z0-9_-]+$/

    if (!nodeIdRegex.test(nodeId)) {
        logger.warn('⚠️ [Validation]: Node ID contains invalid characters')
        return false
    }

    return true
}

/**
 * Check if message size exceeds maximum allowed size
 * @param data - WebSocket message data
 * @returns Object with isValid boolean and size in bytes
 */
export function checkMessageSize(data: any): { isValid: boolean; size: number; maxSize: number } {
    let size = 0

    if (Buffer.isBuffer(data)) {
        size = data.length
    } else if (typeof data === 'string') {
        size = Buffer.byteLength(data, 'utf8')
    } else if (ArrayBuffer.isView(data)) {
        size = data.byteLength
    } else if (data instanceof ArrayBuffer) {
        size = data.byteLength
    } else {
        // Fallback: convert to JSON and measure
        try {
            const jsonStr = JSON.stringify(data)
            size = Buffer.byteLength(jsonStr, 'utf8')
        } catch (error) {
            logger.error('❌ [Validation]: Error calculating message size:', error)
            return { isValid: false, size: 0, maxSize: MAX_MESSAGE_SIZE }
        }
    }

    const isValid = size <= MAX_MESSAGE_SIZE

    if (!isValid) {
        logger.warn(`⚠️ [Validation]: Message size ${size} bytes exceeds maximum ${MAX_MESSAGE_SIZE} bytes`)
    }

    return { isValid, size, maxSize: MAX_MESSAGE_SIZE }
}

/**
 * Sanitize a generic string field to prevent XSS
 * @param value - Value to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(value: string | undefined, maxLength: number = 1000): string {
    if (!value) {
        return ''
    }

    // Remove any HTML tags and script content
    let sanitized = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')

    // Trim whitespace
    sanitized = sanitized.trim()

    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength)
    }

    return sanitized
}

/**
 * Validate timestamp value
 * @param timestamp - Timestamp to validate
 * @returns Valid timestamp or current time
 */
export function sanitizeTimestamp(timestamp: number | undefined): number {
    if (!timestamp) {
        return Date.now()
    }

    const now = Date.now()
    const oneHourAgo = now - 3600000
    const oneHourFromNow = now + 3600000

    // Ensure timestamp is reasonable (within 1 hour of current time)
    if (timestamp < oneHourAgo || timestamp > oneHourFromNow) {
        logger.warn(`⚠️ [Validation]: Timestamp out of acceptable range: ${timestamp}. Using current time.`)
        return now
    }

    return timestamp
}
