import type { ClientOptions } from 'openai'
import { ChatOpenAI as LangchainChatOpenAI, OpenAIChatInput, LegacyOpenAIInput, AzureOpenAIInput } from '@langchain/openai'
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { IMultiModalOption, IVisionChatModal } from '../../../src'

export class ChatOpenAI extends LangchainChatOpenAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(
        id: string,
        fields?: Partial<OpenAIChatInput> &
            Partial<AzureOpenAIInput> &
            BaseChatModelParams & { configuration?: ClientOptions & LegacyOpenAIInput },
        /** @deprecated */
        configuration?: ClientOptions & LegacyOpenAIInput
    ) {
        super(fields, configuration)
        this.id = id
        this.configuredModel = fields?.modelName ?? ''
        this.configuredMaxToken = fields?.maxTokens
    }

    revertToOriginalModel(): void {
        super.modelName = this.configuredModel
        super.maxTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        if (this.modelName !== 'gpt-4-turbo' && !this.modelName.includes('vision')) {
            super.modelName = 'gpt-4-turbo'
            super.maxTokens = this.configuredMaxToken ? this.configuredMaxToken : 1024
        }
    }
}
