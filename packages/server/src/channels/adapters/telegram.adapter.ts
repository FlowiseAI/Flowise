import axios from 'axios'
import { BaseChannelAdapter } from '../base'
import { ChannelAuthenticationError, ChannelValidationError } from '../errors'
import {
    ChannelAdapterRequest,
    ChannelAttachment,
    ChannelOutboundMessage,
    ChannelRequestContext,
    ChannelSendResult,
    NormalizedIncomingMessage
} from '../types'
import { resolveTelegramConfig } from '../config'

interface TelegramUser {
    id: number
    is_bot?: boolean
}

interface TelegramChat {
    id: number
}

interface TelegramMessage {
    message_id: number
    date: number
    text?: string
    caption?: string
    from?: TelegramUser
    chat?: TelegramChat
    photo?: Array<Record<string, unknown>>
    video?: Record<string, unknown>
    document?: Record<string, unknown>
    audio?: Record<string, unknown>
    voice?: Record<string, unknown>
    location?: Record<string, unknown>
}

interface TelegramUpdate {
    update_id: number
    message?: TelegramMessage
    edited_message?: TelegramMessage
    channel_post?: TelegramMessage
    edited_channel_post?: TelegramMessage
}

export class TelegramAdapter extends BaseChannelAdapter {
    readonly provider = 'telegram' as const

    async verifyRequest(request: ChannelAdapterRequest, context: ChannelRequestContext): Promise<void> {
        const config = resolveTelegramConfig(context)

        if (!config.webhookSecret) return

        const headerValue = request.headers['x-telegram-bot-api-secret-token']
        const secretToken = Array.isArray(headerValue) ? headerValue[0] : headerValue

        if (!secretToken || secretToken !== config.webhookSecret) {
            throw new ChannelAuthenticationError('Invalid Telegram webhook secret')
        }
    }

    async parseIncomingMessage(request: ChannelAdapterRequest, _context: ChannelRequestContext): Promise<NormalizedIncomingMessage | null> {
        const update = request.body as TelegramUpdate
        if (!update || typeof update !== 'object') {
            throw new ChannelValidationError('Invalid Telegram payload')
        }

        const message = update.message || update.edited_message || update.channel_post || update.edited_channel_post
        if (!message) {
            return null
        }

        if (message.from?.is_bot) {
            return null
        }

        if (!message.from?.id) {
            throw new ChannelValidationError('Telegram payload missing sender id')
        }

        const text = (message.text || message.caption || '').trim()

        return {
            provider: 'telegram',
            externalUserId: String(message.from.id),
            externalMessageId: String(message.message_id),
            text,
            timestamp: new Date((message.date || Date.now() / 1000) * 1000).toISOString(),
            attachments: this.extractAttachments(message),
            metadata: {
                telegramUpdateId: update.update_id,
                telegramChatId: message.chat?.id,
                telegramMessageId: message.message_id
            }
        }
    }

    async sendMessage(
        message: ChannelOutboundMessage,
        incoming: NormalizedIncomingMessage,
        context: ChannelRequestContext
    ): Promise<ChannelSendResult> {
        const config = resolveTelegramConfig(context)

        const chatId = this.extractChatId(incoming)

        const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`
        const payload = {
            chat_id: chatId,
            text: message.text,
            disable_web_page_preview: config.disableWebPagePreview
        }

        const response = await axios.post(url, payload, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        })

        return {
            success: Boolean(response.data?.ok),
            providerMessageId: response.data?.result?.message_id ? String(response.data.result.message_id) : undefined,
            raw: response.data
        }
    }

    private extractChatId(incoming: NormalizedIncomingMessage): number {
        const chatIdRaw = incoming.metadata?.telegramChatId

        if (typeof chatIdRaw !== 'number') {
            throw new ChannelValidationError('Telegram chat id missing from incoming metadata')
        }

        return chatIdRaw
    }

    private extractAttachments(message: TelegramMessage): ChannelAttachment[] {
        const attachments: ChannelAttachment[] = []

        if (message.photo?.length) {
            attachments.push({ type: 'image' })
        }
        if (message.video) {
            attachments.push({ type: 'video' })
        }
        if (message.document) {
            attachments.push({ type: 'file' })
        }
        if (message.audio) {
            attachments.push({ type: 'audio' })
        }
        if (message.voice) {
            attachments.push({ type: 'audio' })
        }
        if (message.location) {
            attachments.push({ type: 'location' })
        }

        return attachments
    }
}
