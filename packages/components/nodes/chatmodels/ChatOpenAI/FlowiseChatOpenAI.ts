import type { ClientOptions } from 'openai'
import {
    ChatOpenAI as LangchainChatOpenAI,
    OpenAIChatInput,
    LegacyOpenAIInput,
    AzureOpenAIInput,
    ChatOpenAICallOptions
} from '@langchain/openai'
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { IMultiModalOption } from '../../../src'
import { BaseMessageLike, LLMResult } from 'langchain/schema'
import { Callbacks } from '@langchain/core/callbacks/manager'

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

    async generate(messages: BaseMessageLike[][], options?: string[] | ChatOpenAICallOptions, callbacks?: Callbacks): Promise<LLMResult> {
        return super.generate(messages, options, callbacks)
    }
}
