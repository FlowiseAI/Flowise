import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { RateLimiterManager } from '../../utils/rateLimit'
import predictionsServices from '../../services/predictions'
import webhookService from '../../services/webhook'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

const createWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.params.id == null) {
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

        await webhookService.validateWebhookChatflow(req.params.id, workspaceId, body, req.method, req.headers, req.query)

        // Namespace the webhook payload so $webhook.body.*, $webhook.headers.*, $webhook.query.* can coexist
        req.body = {
            webhook: {
                body,
                headers: req.headers,
                query: req.query
            }
        }

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
