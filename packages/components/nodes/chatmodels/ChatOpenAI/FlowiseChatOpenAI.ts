import type { ClientOptions } from 'openai'
import {
    ChatOpenAI as LangchainChatOpenAI,
    OpenAIChatInput,
    LegacyOpenAIInput,
    AzureOpenAIInput,
    ChatOpenAICallOptions
} from '@langchain/openai'
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { BaseLanguageModelInput } from '@langchain/core/language_models/base'
import { BaseMessageChunk, BaseMessageLike, HumanMessage } from '@langchain/core/messages'
import { LLMResult } from '@langchain/core/outputs'
import { Callbacks } from '@langchain/core/callbacks/manager'
import { IMultiModalOption } from '../../../src'
import { addImagesToMessages, MultiModalOptions } from '../../../src/multiModalUtils'

export class ChatOpenAI extends LangchainChatOpenAI {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption?: IMultiModalOption
    id: string

    constructor(
        id: string,
        fields?: Partial<OpenAIChatInput> &
            Partial<AzureOpenAIInput> &
            BaseChatModelParams & { configuration?: ClientOptions & LegacyOpenAIInput; multiModalOption?: IMultiModalOption },
        /** @deprecated */
        configuration?: ClientOptions & LegacyOpenAIInput
    ) {
        super(fields, configuration)
        this.id = id
        this.multiModalOption = fields?.multiModalOption
        this.configuredModel = fields?.modelName ?? 'gpt-3.5-turbo'
        this.configuredMaxToken = fields?.maxTokens
    }

    async invoke(input: BaseLanguageModelInput, options?: ChatOpenAICallOptions): Promise<BaseMessageChunk> {
        return super.invoke(input, options)
    }

    async generate(messages: BaseMessageLike[][], options?: string[] | ChatOpenAICallOptions, callbacks?: Callbacks): Promise<LLMResult> {
        if (this.lc_kwargs.chainData) {
            await this.injectMultiModalMessages(messages, this.lc_kwargs.chainData)
        }
        return super.generate(messages, options, callbacks)
    }

    private async injectMultiModalMessages(messages: BaseMessageLike[][], options: MultiModalOptions) {
        const optionsData = options.nodeOptions
        const messageContent = addImagesToMessages(optionsData, this.multiModalOption)
        if (messageContent?.length) {
            if (messages[0].length > 0 && messages[0][messages[0].length - 1] instanceof HumanMessage) {
                // Change model to gpt-4-vision
                this.modelName = 'gpt-4-vision-preview'

                // Change default max token to higher when using gpt-4-vision
                this.maxTokens = 1024

                messages[0].push(new HumanMessage({ content: messageContent }))
            }
        } else {
            // revert to previous values if image upload is empty
            this.modelName = this.configuredModel
            this.maxTokens = this.configuredMaxToken
        }
    }
}
