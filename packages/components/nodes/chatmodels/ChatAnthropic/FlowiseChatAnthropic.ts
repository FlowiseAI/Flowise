import { AnthropicInput, ChatAnthropic as LangchainChatAnthropic } from '@langchain/anthropic'
import { type BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { IVisionChatModal, IMultiModalOption } from '../../../src'

export class ChatAnthropic extends LangchainChatAnthropic implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields?: Partial<AnthropicInput> & BaseChatModelParams) {
        // @ts-ignore
        super(fields ?? {})
        this.id = id
        this.configuredModel = fields?.modelName || ''
        this.configuredMaxToken = fields?.maxTokens ?? 2048
    }

    revertToOriginalModel(): void {
        this.modelName = this.configuredModel
        this.maxTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        if (!this.modelName.startsWith('claude-3')) {
            this.modelName = 'claude-3-haiku-20240307'
            this.maxTokens = this.configuredMaxToken ? this.configuredMaxToken : 2048
        }
    }
}
