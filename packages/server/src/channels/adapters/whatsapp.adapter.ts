import axios from 'axios'
import { resolveMetaConfig, resolveWhatsappPhoneNumberId } from '../config'
import { ChannelValidationError } from '../errors'
import {
    ChannelAdapterRequest,
    ChannelAttachment,
    ChannelOutboundMessage,
    ChannelRequestContext,
    ChannelSendResult,
    NormalizedIncomingMessage
} from '../types'
import { MetaBaseAdapter } from './meta.base'

interface WhatsAppMessage {
    id: string
    from: string
    timestamp?: string
    type?: string
    text?: { body?: string }
    image?: Record<string, unknown>
    audio?: Record<string, unknown>
    video?: Record<string, unknown>
    document?: Record<string, unknown>
    location?: Record<string, unknown>
}

interface WhatsAppValue {
    metadata?: { phone_number_id?: string }
    messages?: WhatsAppMessage[]
}

interface WhatsAppUpdate {
    object?: string
    entry?: Array<{
        changes?: Array<{
            field?: string
            value?: WhatsAppValue
        }>
    }>
}

export class WhatsAppAdapter extends MetaBaseAdapter {
    readonly provider = 'whatsapp' as const

    async verifyRequest(request: ChannelAdapterRequest, context: ChannelRequestContext): Promise<void> {
        this.verifyMetaSignature(request, context)
    }

    async parseIncomingMessage(request: ChannelAdapterRequest, _context: ChannelRequestContext): Promise<NormalizedIncomingMessage | null> {
        const payload = request.body as WhatsAppUpdate
        if (!payload || typeof payload !== 'object') {
            throw new ChannelValidationError('Invalid WhatsApp payload')
        }

        const change = payload.entry?.[0]?.changes?.[0]
        const value = change?.value
        const message = value?.messages?.[0]

        if (!message) return null

        if (!message.from) {
            throw new ChannelValidationError('WhatsApp payload missing sender id')
        }

        const text = (message.text?.body || '').trim()

        return {
            provider: 'whatsapp',
            externalUserId: message.from,
            externalMessageId: message.id,
            text,
            timestamp: message.timestamp ? new Date(parseInt(message.timestamp, 10) * 1000).toISOString() : new Date().toISOString(),
            attachments: this.extractAttachments(message),
            metadata: {
                phoneNumberId: value?.metadata?.phone_number_id,
                messageType: message.type
            }
        }
    }

    async sendMessage(
        message: ChannelOutboundMessage,
        incoming: NormalizedIncomingMessage,
        context: ChannelRequestContext
    ): Promise<ChannelSendResult> {
        const config = resolveMetaConfig(context)
        const phoneNumberId = resolveWhatsappPhoneNumberId(context)

        const response = await axios.post(
            `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                to: incoming.externalUserId,
                type: 'text',
                text: {
                    body: message.text,
                    preview_url: false
                }
            },
            {
                timeout: 10000,
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        return {
            success: Boolean(response.data?.messages?.[0]?.id || response.data?.success),
            providerMessageId: response.data?.messages?.[0]?.id,
            raw: response.data
        }
    }

    private extractAttachments(message: WhatsAppMessage): ChannelAttachment[] {
        const attachments: ChannelAttachment[] = []
        if (message.image) attachments.push({ type: 'image' })
        if (message.audio) attachments.push({ type: 'audio' })
        if (message.video) attachments.push({ type: 'video' })
        if (message.document) attachments.push({ type: 'file' })
        if (message.location) attachments.push({ type: 'location' })
        return attachments
    }
}
