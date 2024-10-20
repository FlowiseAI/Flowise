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
        this.modelName = this.configuredModel
        this.maxTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        if (this.modelName !== 'gpt-4-turbo' && !this.modelName.includes('vision')) {
            this.modelName = 'gpt-4-turbo'
            this.maxTokens = this.configuredMaxToken ? this.configuredMaxToken : 1024
        }
    }
}
