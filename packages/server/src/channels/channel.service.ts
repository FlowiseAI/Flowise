import crypto from 'crypto'
import { StatusCodes } from 'http-status-codes'
import logger from '../utils/logger'
import {
    CHANNEL_PROVIDERS,
    ChannelAdapterRequest,
    ChannelProcessingOptions,
    ChannelProcessingResult,
    ChannelProvider,
    ChannelRuntime
} from './types'
import { channelAdapterRegistry } from './registry'
import { ChannelAdapterNotFoundError, ChannelValidationError } from './errors'
import { getErrorMessage } from '../errors/utils'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { ChannelInboundMessage } from '../database/entities/ChannelInboundMessage'

export class ChannelService {
    constructor(private readonly runtime: ChannelRuntime) {}

    async processIncomingRequest(
        provider: string,
        request: ChannelAdapterRequest,
        options: ChannelProcessingOptions
    ): Promise<ChannelProcessingResult> {
        const normalizedProvider = this.validateProvider(provider)
        const adapter = channelAdapterRegistry.get(normalizedProvider)

        if (!adapter) {
            throw new ChannelAdapterNotFoundError(normalizedProvider)
        }

        const context = {
            chatflowId: options.chatflowId,
            agentChannelId: options.agentChannelId,
            channelAccountId: options.channelAccountId,
            accountConfig: options.accountConfig,
            credentialData: options.credentialData
        }
        await adapter.verifyRequest(request, context)
        const incoming = await adapter.parseIncomingMessage(request, context)

        if (!incoming) {
            return {
                status: 'ignored',
                provider: normalizedProvider
            }
        }

        const shouldProcessIncoming = await this.shouldProcessIncomingMessage(normalizedProvider, options.channelAccountId, incoming.externalMessageId)
        if (!shouldProcessIncoming) {
            return {
                status: 'ignored',
                provider: normalizedProvider
            }
        }

        const sanitizedQuestion = incoming.text.trim()
        if (!sanitizedQuestion) {
            return {
                status: 'ignored',
                provider: normalizedProvider
            }
        }

        const sessionScope = options.agentChannelId || options.channelAccountId || ''
        const session = buildChannelSession(normalizedProvider, incoming.externalUserId, sessionScope)
        const prediction = await this.runtime.runPrediction({
            chatflowId: options.chatflowId,
            question: sanitizedQuestion,
            session,
            metadata: {
                provider: normalizedProvider,
                externalMessageId: incoming.externalMessageId
            }
        })

        if (options.autoReply !== false && prediction.text.trim()) {
            try {
                const sendResult = await adapter.sendMessage({ text: prediction.text }, incoming, context)
                logger.info(
                    `[channel]: provider=${normalizedProvider}, session=${session.sessionId}, sent=${sendResult.success}, responseLen=${prediction.text.length}`
                )
            } catch (error) {
                const details = this.getSendFailureDetails(error)
                logger.error(
                    `[channel]: outbound send failed provider=${normalizedProvider}, session=${session.sessionId}, status=${details.statusCode}, code=${details.code}, message="${details.message}", url="${details.url}", response="${details.responseData}"`
                )
            }
        }

        return {
            status: 'processed',
            provider: normalizedProvider,
            sessionId: session.sessionId,
            responseText: prediction.text,
            raw: prediction.raw
        }
    }

    private validateProvider(provider: string): ChannelProvider {
        if (!provider || typeof provider !== 'string') {
            throw new ChannelValidationError('provider is required')
        }
        const normalized = provider.toLowerCase().trim()

        if (!CHANNEL_PROVIDERS.includes(normalized as ChannelProvider)) {
            throw new ChannelValidationError(`Unsupported channel provider: ${provider}`)
        }

        return normalized as ChannelProvider
    }

    private async shouldProcessIncomingMessage(
        provider: ChannelProvider,
        channelAccountId?: string,
        externalMessageId?: string
    ): Promise<boolean> {
        const normalizedExternalMessageId = (externalMessageId ?? '').trim()
        const normalizedChannelAccountId = (channelAccountId ?? '').trim()

        // If provider does not provide message id, skip dedupe gracefully.
        if (!normalizedExternalMessageId || !normalizedChannelAccountId) {
            return true
        }

        try {
            const appServer = getRunningExpressApp()
            await appServer.AppDataSource.getRepository(ChannelInboundMessage).insert({
                provider,
                channelAccountId: normalizedChannelAccountId,
                externalMessageId: normalizedExternalMessageId
            })
            return true
        } catch (error) {
            if (this.isInboundMessageDuplicate(error)) {
                logger.warn(
                    `[channel]: duplicate inbound ignored provider=${provider}, channelAccountId=${normalizedChannelAccountId}, externalMessageId=${normalizedExternalMessageId}`
                )
                return false
            }
            throw error
        }
    }

    private isInboundMessageDuplicate(error: unknown): boolean {
        const message = getErrorMessage(error).toLowerCase()
        return (
            message.includes('uq_channel_inbound_message_provider_account_external') ||
            (message.includes('channel_inbound_message') && message.includes('duplicate')) ||
            (message.includes('channel_inbound_message') && message.includes('unique constraint'))
        )
    }

    private getSendFailureDetails(error: unknown): {
        statusCode: number | string
        code: string
        message: string
        url: string
        responseData: string
    } {
        if (error && typeof error === 'object') {
            const errObj = error as {
                message?: string
                code?: string
                response?: { status?: number; data?: unknown }
                config?: { url?: string }
            }

            return {
                statusCode: errObj.response?.status ?? 'n/a',
                code: errObj.code ?? 'n/a',
                message: errObj.message ?? 'Unknown send error',
                url: errObj.config?.url ?? 'n/a',
                responseData:
                    errObj.response?.data !== undefined
                        ? typeof errObj.response.data === 'string'
                            ? errObj.response.data
                            : JSON.stringify(errObj.response.data)
                        : 'n/a'
            }
        }

        return {
            statusCode: 'n/a',
            code: 'n/a',
            message: String(error),
            url: 'n/a',
            responseData: 'n/a'
        }
    }
}

export const buildChannelSession = (provider: ChannelProvider, externalUserId: string, scopeKey: string = '') => {
    const normalizedExternalUserId = externalUserId.trim()
    if (!normalizedExternalUserId) {
        throw new ChannelValidationError('externalUserId is required')
    }

    const userHash = crypto.createHash('sha256').update(`${provider}:${scopeKey}:${normalizedExternalUserId}`).digest('hex').slice(0, 32)
    const sessionId = `${provider}:${userHash}`

    return {
        sessionId,
        chatId: sessionId
    }
}

export const createChannelErrorResponse = (error: unknown) => {
    if (error instanceof Error && 'statusCode' in error) {
        const statusCode = Number((error as { statusCode?: number }).statusCode)
        return {
            statusCode: Number.isFinite(statusCode) ? statusCode : StatusCodes.INTERNAL_SERVER_ERROR,
            body: {
                error: error.message
            }
        }
    }

    if (error instanceof Error) {
        const shouldExposeErrorMessage = process.env.CHANNEL_WEBHOOK_DEBUG === 'true'
        return {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            body: {
                error: shouldExposeErrorMessage ? error.message : 'Internal channel processing error'
            }
        }
    }

    return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: {
            error: 'Internal channel processing error'
        }
    }
}
