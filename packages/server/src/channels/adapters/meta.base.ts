import { BaseChannelAdapter } from '../base'
import { ChannelAuthenticationError, ChannelValidationError } from '../errors'
import { ChannelAdapterRequest, ChannelRequestContext } from '../types'
import { resolveMetaConfig } from '../config'
import logger from '../../utils/logger'

export abstract class MetaBaseAdapter extends BaseChannelAdapter {
    protected verifyMetaSignature(request: ChannelAdapterRequest, context: ChannelRequestContext): void {
        const config = resolveMetaConfig(context)
        const rawBody = request.rawBody
        const headerValue = request.headers['x-hub-signature-256']
        const signature = Array.isArray(headerValue) ? headerValue[0] : headerValue
        const debugEnabled = process.env.CHANNEL_WEBHOOK_DEBUG === 'true'
        const provider = this.provider
        const signaturePreview = typeof signature === 'string' ? signature.slice(0, 24) : undefined
        const logMeta = {
            provider,
            channelAccountId: context.channelAccountId ?? null,
            agentChannelId: context.agentChannelId ?? null,
            hasRawBody: !!rawBody,
            rawBodyLength: rawBody?.length ?? 0,
            hasSignatureHeader: !!signature,
            signaturePreview,
            signatureLength: typeof signature === 'string' ? signature.length : 0,
            hasAppSecret: !!config.appSecret
        }

        if (debugEnabled) {
            logger.info(`[channel]: incoming ${provider} webhook POST`, logMeta)
        }

        if (!rawBody) {
            logger.warn(`[channel]: ${provider} webhook auth failed: missing raw body`, logMeta)
            throw new ChannelValidationError('Raw request body is required for Meta signature verification')
        }

        if (!signature) {
            logger.warn(`[channel]: ${provider} webhook auth failed: missing signature header`, logMeta)
            throw new ChannelAuthenticationError('Missing Meta signature header')
        }

        try {
            this.verifyHmacSha256(rawBody, signature, config.appSecret)
            if (debugEnabled) {
                logger.info(`[channel]: ${provider} webhook auth succeeded`, logMeta)
            }
        } catch (error) {
            logger.warn(`[channel]: ${provider} webhook auth failed: invalid signature`, logMeta)
            throw error
        }
    }
}
