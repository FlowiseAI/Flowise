import axios from 'axios'
import { resolveInstagramUserId, resolveMetaConfig } from '../config'
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

interface InstagramMessagingEvent {
    sender?: { id?: string }
    recipient?: { id?: string }
    timestamp?: number
    message?: {
        mid?: string
        text?: string
        attachments?: Array<{ type?: string }>
    }
}

interface InstagramUpdate {
    object?: string
    entry?: Array<{
        messaging?: InstagramMessagingEvent[]
    }>
}

export class InstagramAdapter extends MetaBaseAdapter {
    readonly provider = 'instagram' as const

    async verifyRequest(request: ChannelAdapterRequest, context: ChannelRequestContext): Promise<void> {
        this.verifyMetaSignature(request, context)
    }

    async parseIncomingMessage(request: ChannelAdapterRequest, _context: ChannelRequestContext): Promise<NormalizedIncomingMessage | null> {
        const payload = request.body as InstagramUpdate
        if (!payload || typeof payload !== 'object') {
            throw new ChannelValidationError('Invalid Instagram payload')
        }

        const event = payload.entry?.[0]?.messaging?.[0]
        if (!event) return null

        const senderId = event.sender?.id
        if (!senderId) {
            throw new ChannelValidationError('Instagram payload missing sender id')
        }

        const text = (event.message?.text || '').trim()

        return {
            provider: 'instagram',
            externalUserId: senderId,
            externalMessageId: event.message?.mid,
            text,
            timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
            attachments: this.extractAttachments(event.message?.attachments),
            metadata: {
                recipientId: event.recipient?.id
            }
        }
    }

    async sendMessage(
        message: ChannelOutboundMessage,
        incoming: NormalizedIncomingMessage,
        context: ChannelRequestContext
    ): Promise<ChannelSendResult> {
        const config = resolveMetaConfig(context)
        const instagramUserId = resolveInstagramUserId(context)

        const response = await axios.post(
            `https://graph.facebook.com/v23.0/${instagramUserId}/messages`,
            {
                recipient: { id: incoming.externalUserId },
                message: { text: message.text },
                messaging_type: 'RESPONSE'
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
            success: Boolean(response.data?.message_id || response.data?.recipient_id),
            providerMessageId: response.data?.message_id,
            raw: response.data
        }
    }

    private extractAttachments(attachments?: Array<{ type?: string }>): ChannelAttachment[] {
        if (!attachments?.length) return []

        return attachments.map((attachment) => {
            const type = attachment.type
            if (type === 'image') return { type: 'image' as const }
            if (type === 'video') return { type: 'video' as const }
            if (type === 'audio') return { type: 'audio' as const }
            if (type === 'file') return { type: 'file' as const }
            return { type: 'unknown' as const }
        })
    }
}
