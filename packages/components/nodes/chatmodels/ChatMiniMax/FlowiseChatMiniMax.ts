import { ChatAnthropic as LangchainChatAnthropic, AnthropicInput } from '@langchain/anthropic'
import { type BaseChatModelParams } from '@langchain/core/language_models/chat_models'

export interface ChatMiniMaxInput extends Partial<AnthropicInput>, BaseChatModelParams {
    miniMaxApiKey?: string
}

export class ChatMiniMax extends LangchainChatAnthropic {
    configuredModel: string
    configuredMaxToken?: number
    id: string

    constructor(id: string, fields?: ChatMiniMaxInput) {
        const miniMaxApiKey = fields?.miniMaxApiKey || fields?.anthropicApiKey

        super({
            ...fields,
            anthropicApiKey: miniMaxApiKey,
            clientOptions: {
                baseURL: 'https://api.minimax.io/anthropic'
            }
        })

        this.id = id
        this.configuredModel = fields?.modelName || 'MiniMax-M2.5'
        this.configuredMaxToken = fields?.maxTokens

        // @langchain/anthropic defaults topP and topK to -1 as an "unset" sentinel and
        // always serialises them into the request body.  The real Anthropic API accepts
        // -1 silently, but MiniMax's Anthropic-compatible endpoint requires top_p/top_k
        // to be in (0, 1].  Setting them to undefined causes JSON.stringify to omit the
        // fields entirely so MiniMax applies its own defaults.
        if (fields?.topP === undefined) this.topP = undefined as unknown as number
        if (fields?.topK === undefined) this.topK = undefined as unknown as number
    }

    revertToOriginalModel(): void {
        this.modelName = this.configuredModel
        this.maxTokens = this.configuredMaxToken as number
    }
}
