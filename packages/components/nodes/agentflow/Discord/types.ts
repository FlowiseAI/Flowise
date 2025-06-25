import { ICommonObject } from '../../../src/Interface'

export interface DiscordMessage {
    id: string
    content: string
    author: {
        id: string
        username: string
        discriminator: string
        avatar?: string
    }
    timestamp: string
    edited_timestamp?: string
    mentions: any[]
    attachments: any[]
    embeds: any[]
    reactions?: any[]
    pinned: boolean
    type: number
}

export interface DiscordMessagesOutput {
    id: string
    name: string
    input: { form: { channelId: string; limit: number; beforeId?: string; afterId?: string; aroundId?: string } }
    output: {
        form: {
            messages: DiscordMessage[]
            metadata: {
                channelId: string
                messageCount: number
                fetchedAt: string
                paginationType: 'before' | 'after' | 'around' | 'recent'
            }
        }
    }
    state: ICommonObject
}

export interface DiscordSendMessageOutput {
    id: string
    name: string
    input: {
        form: {
            channelId: string
            content?: string
            embeds?: any[]
            files?: any[]
            replyToMessageId?: string
        }
    }
    output: {
        form: {
            message: DiscordMessage
            metadata: {
                channelId: string
                messageId: string
                sentAt: string
                isReply: boolean
            }
        }
    }
    state: ICommonObject
}
