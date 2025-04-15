import { Request, Response, NextFunction } from 'express'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { google } from 'googleapis'

/**
 * Get Gmail labels for the authenticated user
 */
const getLabels = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get access token from request (either query params or body)
        const accessToken = req.method === 'GET' ? req.query.accessToken : req.body.accessToken

        if (!accessToken) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Access token is required')
        }

        // Create OAuth client with the provided access token
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: accessToken as string })

        // Create Gmail API client
        const gmail = google.gmail({
            version: 'v1',
            auth: oauth2Client
        })

        // Get labels
        const response = await gmail.users.labels.list({
            userId: 'me'
        })

        // Return labels
        return res.status(StatusCodes.OK).json({ labels: response.data.labels })
    } catch (error: unknown) {
        console.error('Error getting Gmail labels:', error)

        // Type check error before accessing properties
        if (
            error &&
            typeof error === 'object' &&
            'response' in error &&
            error.response &&
            typeof error.response === 'object' &&
            'data' in error.response
        ) {
            const typedError = error as any
            return res.status(typedError.response.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: typedError.response.data.error || 'Error fetching Gmail labels',
                details: typedError.response.data
            })
        }

        next(error)
    }
}

/**
 * Get messages for a specific label
 */
const getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get parameters from request
        const method = req.method
        const accessToken = method === 'GET' ? req.query.accessToken : req.body.accessToken
        const labelId = method === 'GET' ? req.query.labelId : req.body.labelId
        const maxResults = method === 'GET' ? parseInt(req.query.maxResults as string) || 10 : req.body.maxResults || 10

        if (!accessToken) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Access token is required')
        }

        if (!labelId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Label ID is required')
        }

        // Create OAuth client
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: accessToken as string })

        // Create Gmail API client
        const gmail = google.gmail({
            version: 'v1',
            auth: oauth2Client
        })

        // Get messages by label
        const response = await gmail.users.messages.list({
            userId: 'me',
            labelIds: [labelId as string],
            maxResults
        })

        // Return messages
        return res.status(StatusCodes.OK).json({
            messages: response.data.messages || [],
            nextPageToken: response.data.nextPageToken
        })
    } catch (error: unknown) {
        console.error('Error getting Gmail messages:', error)

        // Type check error before accessing properties
        if (
            error &&
            typeof error === 'object' &&
            'response' in error &&
            error.response &&
            typeof error.response === 'object' &&
            'data' in error.response
        ) {
            const typedError = error as any
            return res.status(typedError.response.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: typedError.response.data.error || 'Error fetching Gmail messages',
                details: typedError.response.data
            })
        }

        next(error)
    }
}

/**
 * Get a specific message by ID
 */
const getMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get parameters from request
        const method = req.method
        const accessToken = method === 'GET' ? req.query.accessToken : req.body.accessToken
        const messageId = method === 'GET' ? req.params.messageId : req.body.messageId
        const format = method === 'GET' ? req.query.format : req.body.format || 'full'

        if (!accessToken) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Access token is required')
        }

        if (!messageId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Message ID is required')
        }

        // Create OAuth client
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: accessToken as string })

        // Create Gmail API client
        const gmail = google.gmail({
            version: 'v1',
            auth: oauth2Client
        })

        // Get message details
        const response = await gmail.users.messages.get({
            userId: 'me',
            id: messageId as string,
            format: format as string
        })

        // Return message details
        return res.status(StatusCodes.OK).json(response.data)
    } catch (error: unknown) {
        console.error('Error getting Gmail message:', error)

        // Type check error before accessing properties
        if (
            error &&
            typeof error === 'object' &&
            'response' in error &&
            error.response &&
            typeof error.response === 'object' &&
            'data' in error.response
        ) {
            const typedError = error as any
            return res.status(typedError.response.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: typedError.response.data.error || 'Error fetching Gmail message',
                details: typedError.response.data
            })
        }

        next(error)
    }
}

export default {
    getLabels,
    getMessages,
    getMessage
}
