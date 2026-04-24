import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import { RateLimiterManager } from '../../utils/rateLimit'
import predictionsServices from '../../services/predictions'
import webhookService from '../../services/webhook'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { checkDenyList } from 'flowise-components'
import { dispatchCallback } from '../../utils/callbackDispatcher'
import { getErrorMessage } from '../../errors/utils'

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

        const { callbackUrl: nodeCallbackUrl, callbackSecret } = await webhookService.validateWebhookChatflow(
            req.params.id,
            workspaceId,
            body,
            req.method,
            req.headers,
            req.query,
            (req as any).rawBody,
            isResume ? { skipFieldValidation: true } : undefined
        )

        const callbackUrl: string | undefined = nodeCallbackUrl

        // Namespace the webhook payload so $webhook.body.*, $webhook.headers.*, $webhook.query.* can coexist
        req.body = {
            webhook: {
                body,
                headers: req.headers,
                query: req.query
            }
        }

        const { humanInput, chatId: bodyChatId, sessionId } = body ?? {}
        if (humanInput != null) req.body.humanInput = humanInput
        if (bodyChatId != null) req.body.chatId = bodyChatId
        if (sessionId != null) req.body.sessionId = sessionId

        if (callbackUrl) {
            try {
                const parsed = new URL(callbackUrl)
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
                await checkDenyList(callbackUrl)
            } catch {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Invalid callbackUrl: must be a valid and safe http or https URL`)
            }

            // Pre-assign chatId so the 202 response and the background execution share the same ID
            const chatId: string = (bodyChatId as string | undefined) ?? uuidv4()
            req.body.chatId = chatId

            res.status(202).json({ chatId, status: 'PROCESSING' })

            setImmediate(async () => {
                try {
                    const apiResponse = await predictionsServices.buildChatflow(req)

                    // apiResponse.action is the parsed humanInputAction — only present when flow is STOPPED (FLOWISE-387)
                    if (apiResponse.action) {
                        await dispatchCallback(
                            callbackUrl,
                            {
                                status: 'STOPPED',
                                chatId,
                                data: { text: apiResponse.text, executionId: apiResponse.executionId, action: apiResponse.action }
                            },
                            callbackSecret
                        )
                    } else {
                        await dispatchCallback(callbackUrl, { status: 'SUCCESS', chatId, data: apiResponse }, callbackSecret)
                    }
                } catch (err: any) {
                    await dispatchCallback(callbackUrl, { status: 'ERROR', chatId, error: getErrorMessage(err) }, callbackSecret)
                }
            })
            return
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
