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

        await webhookService.validateWebhookChatflow(req.params.id, workspaceId, req.body)

        // Namespace the webhook payload so $webhook.body.*, $webhook.headers.*, $webhook.query.* can coexist
        req.body = { webhook: { body: req.body } }

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
