import { NextFunction, Request, Response } from 'express'
import type { ChannelAdapterRequest } from '../../channels/types'
import { createChannelErrorResponse } from '../../channels/channel.service'
import { channelService } from '../../channels/service'
import channelsDataService from '../../services/channels'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import logger from '../../utils/logger'

const buildAdapterRequest = (req: Request): ChannelAdapterRequest => ({
    headers: req.headers,
    body: req.body,
    query: req.query as Record<string, string | string[]>,
    params: req.params,
    rawBody: req.rawBody
})

const getQueryStringValue = (value: unknown): string => {
    if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
    if (typeof value === 'string') return value
    return ''
}

const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const provider = req.params.provider
        const webhookPath = req.params.webhookPath
        if (process.env.CHANNEL_WEBHOOK_DEBUG === 'true') {
            const rawBody = typeof req.rawBody === 'string' ? req.rawBody : ''
            const fallbackBody = rawBody ? '' : JSON.stringify(req.body ?? {})
            const payload = rawBody || fallbackBody
            const maxPayloadLength = 20000
            const truncatedPayload =
                payload.length > maxPayloadLength ? `${payload.slice(0, maxPayloadLength)}...[truncated:${payload.length}]` : payload
            logger.debug(
                `[channel-webhook] POST body provider=${provider} webhookPath=${webhookPath} payload=${truncatedPayload}`
            )
        }

        const runtimeContext = await channelsDataService.resolveRuntimeContextByWebhookPath(provider, webhookPath)

        const result = await channelService.processIncomingRequest(provider, buildAdapterRequest(req), {
            chatflowId: runtimeContext.chatflowId,
            autoReply: true,
            agentChannelId: runtimeContext.agentChannelId,
            channelAccountId: runtimeContext.channelAccountId,
            accountConfig: runtimeContext.accountConfig,
            credentialData: runtimeContext.credentialData
        })

        return res.json({ status: result.status })
    } catch (error) {
        const channelError = createChannelErrorResponse(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined
        logger.error(
            `[channel-webhook] POST exception provider=${req.params.provider} webhookPath=${req.params.webhookPath} status=${channelError.statusCode} message="${errorMessage}" stack="${errorStack ?? ''}"`
        )
        logger.warn(
            `[channel-webhook] POST failed provider=${req.params.provider} webhookPath=${req.params.webhookPath} status=${channelError.statusCode} error="${channelError.body.error}"`
        )
        if (channelError.statusCode >= 500) return next(error)
        return res.status(channelError.statusCode).json(channelError.body)
    }
}

const verifyMetaChallenge = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const provider = req.params.provider
        const webhookPath = req.params.webhookPath

        if (provider !== 'whatsapp' && provider !== 'instagram') {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Meta challenge is only supported for whatsapp and instagram providers')
        }

        const runtimeContext = await channelsDataService.resolveRuntimeContextByWebhookPath(provider, webhookPath)
        const credentialData = runtimeContext.credentialData

        const mode = getQueryStringValue(req.query['hub.mode'])
        const token = getQueryStringValue(req.query['hub.verify_token'])
        const challenge = getQueryStringValue(req.query['hub.challenge'])

        if (mode !== 'subscribe') {
            return res.status(400).send('Invalid mode')
        }

        const verifyToken = typeof credentialData.verifyToken === 'string' ? credentialData.verifyToken : ''

        if (!verifyToken || token !== verifyToken) {
            return res.status(403).send('Forbidden')
        }

        return res.status(200).send(challenge)
    } catch (error) {
        const channelError = createChannelErrorResponse(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined
        logger.error(
            `[channel-webhook] GET exception provider=${req.params.provider} webhookPath=${req.params.webhookPath} status=${channelError.statusCode} message="${errorMessage}" stack="${errorStack ?? ''}"`
        )
        logger.warn(
            `[channel-webhook] GET verify failed provider=${req.params.provider} webhookPath=${req.params.webhookPath} status=${channelError.statusCode} error="${channelError.body.error}"`
        )
        if (channelError.statusCode >= 500) return next(error)
        return res.status(channelError.statusCode).json(channelError.body)
    }
}

export default {
    handleWebhook,
    verifyMetaChallenge
}
