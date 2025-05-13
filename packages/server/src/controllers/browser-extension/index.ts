import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import browserExtensionService from '../../services/browser-extension'

/**
 * Get chatflows available for the browser extension
 * Requires standard Bearer authentication like other endpoints
 */
const getBrowserExtensionChatflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // User authentication is handled by middleware
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized access to browser extension endpoint')
        }

        // Get chatflows visible to browser extension for the authenticated user
        const apiResponse = await browserExtensionService.getBrowserExtensionChatflows(req.user)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

/**
 * Update Browser Extension visibility for a chatflow
 * Requires standard Bearer authentication like other endpoints
 */
const updateBrowserExtensionVisibility = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // User authentication is handled by middleware
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized access to browser extension endpoint')
        }

        // Validate request parameters
        if (typeof req.params.id !== 'string') {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Chatflow ID must be provided')
        }

        // Validate request body
        if (typeof req.body.enabled !== 'boolean') {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Request body must include "enabled" boolean field')
        }

        // Update the visibility settings
        const apiResponse = await browserExtensionService.updateBrowserExtensionVisibility(req.params.id, req.body.enabled, req.user)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getBrowserExtensionChatflows,
    updateBrowserExtensionVisibility
}
