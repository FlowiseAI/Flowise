import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { RateLimiterManager } from '../../utils/rateLimit'
import predictionsServices from '../../services/predictions'
import webhookService from '../../services/webhook'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

const createWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: webhookController.createWebhook - id not provided!`)
        }

        const workspaceId = req.user?.activeWorkspaceId

        // For form-encoded requests, unwrap JSON encoded in a `payload` field (e.g. GitHub webhooks)
        // so $webhook.body.* resolves against the actual payload fields.
        const contentType = (req.headers['content-type'] ?? '').toLowerCase()
        let body = req.body
        if (contentType.startsWith('application/x-www-form-urlencoded') && typeof body?.payload === 'string') {
            try {
                body = JSON.parse(body.payload)
            } catch {
                // leave body as-is if payload isn't valid JSON
            }
        }

        const isResume = body?.humanInput != null

        await webhookService.validateWebhookChatflow(
            req.params.id,
            workspaceId,
            body,
            req.method,
            req.headers,
            req.query,
            (req as any).rawBody,
            isResume ? { skipFieldValidation: true } : undefined
        )

        // Namespace the webhook payload so $webhook.body.*, $webhook.headers.*, $webhook.query.* can coexist
        req.body = {
            webhook: {
                body,
                headers: req.headers,
                query: req.query
            }
        }

        const { humanInput, chatId, sessionId } = body ?? {}
        if (humanInput != null) req.body.humanInput = humanInput
        if (chatId != null) req.body.chatId = chatId
        if (sessionId != null) req.body.sessionId = sessionId

        const apiResponse = await predictionsServices.buildChatflow(req)
        return res.json(apiResponse)
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
    createWebhook,
    getRateLimiterMiddleware
}
