import { AnthropicInput, ChatAnthropic as LangchainChatAnthropic } from '@langchain/anthropic'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { IVisionChatModal, IMultiModalOption } from '../../../src'

export class ChatAnthropic extends LangchainChatAnthropic implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields: Partial<AnthropicInput> & BaseLLMParams & { anthropicApiKey?: string }) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.modelName || ''
        this.configuredMaxToken = fields?.maxTokens ?? 2048
    }

    revertToOriginalModel(): void {
        super.modelName = this.configuredModel
        super.maxTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        if (!this.modelName.startsWith('claude-3')) {
            super.modelName = 'claude-3-haiku-20240307'
            super.maxTokens = this.configuredMaxToken ? this.configuredMaxToken : 2048
        }
    }
}
