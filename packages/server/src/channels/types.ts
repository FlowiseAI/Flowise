import { IncomingHttpHeaders } from 'http'

export const CHANNEL_PROVIDERS = ['telegram', 'whatsapp', 'instagram'] as const

export type ChannelProvider = (typeof CHANNEL_PROVIDERS)[number]

export interface ChannelAdapterRequest {
    headers: IncomingHttpHeaders
    body: unknown
    rawBody?: string
    query?: Record<string, string | string[]>
    params?: Record<string, string>
}

export interface ChannelRequestContext {
    chatflowId: string
    agentChannelId?: string
    channelAccountId?: string
    accountConfig?: Record<string, unknown>
    credentialData?: Record<string, unknown>
}

export interface ChannelAttachment {
    id?: string
    type: 'image' | 'audio' | 'video' | 'file' | 'location' | 'unknown'
    url?: string
    mimeType?: string
    metadata?: Record<string, unknown>
}

export interface NormalizedIncomingMessage {
    provider: ChannelProvider
    externalUserId: string
    externalMessageId?: string
    text: string
    timestamp: string
    attachments?: ChannelAttachment[]
    metadata?: Record<string, unknown>
}

export interface ChannelSession {
    sessionId: string
    chatId: string
}

export interface ChannelPredictionRequest {
    chatflowId: string
    question: string
    session: ChannelSession
    metadata?: Record<string, unknown>
}

export interface ChannelPredictionResult {
    text: string
    raw: unknown
}

export interface ChannelOutboundMessage {
    text: string
    metadata?: Record<string, unknown>
}

export interface ChannelSendResult {
    success: boolean
    providerMessageId?: string
    raw?: unknown
}

export interface ChannelAdapter {
    readonly provider: ChannelProvider

    verifyRequest(request: ChannelAdapterRequest, context: ChannelRequestContext): Promise<void>
    parseIncomingMessage(request: ChannelAdapterRequest, context: ChannelRequestContext): Promise<NormalizedIncomingMessage | null>
    sendMessage(
        message: ChannelOutboundMessage,
        incoming: NormalizedIncomingMessage,
        context: ChannelRequestContext
    ): Promise<ChannelSendResult>
}

export interface ChannelRuntime {
    runPrediction(input: ChannelPredictionRequest): Promise<ChannelPredictionResult>
}

export interface ChannelProcessingOptions {
    chatflowId: string
    autoReply?: boolean
    agentChannelId?: string
    channelAccountId?: string
    accountConfig?: Record<string, unknown>
    credentialData?: Record<string, unknown>
}

export interface ChannelProcessingResult {
    status: 'processed' | 'ignored'
    provider: ChannelProvider
    sessionId?: string
    responseText?: string
    raw?: unknown
}
