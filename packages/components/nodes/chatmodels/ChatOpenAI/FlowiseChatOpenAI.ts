import { ChatOpenAI as LangchainChatOpenAI, OpenAIChatInput } from 'langchain/chat_models/openai'
import { BaseChatModelParams } from 'langchain/chat_models/base'
import type { ClientOptions } from 'openai'
import type { LegacyOpenAIInput } from '@langchain/openai/dist/types'
import { BaseLanguageModelInput } from 'langchain/base_language'
import { ChatOpenAICallOptions } from '@langchain/openai/dist/chat_models'
import { BaseMessageChunk, BaseMessageLike, HumanMessage, LLMResult } from 'langchain/schema'
import { Callbacks } from '@langchain/core/callbacks/manager'
import { ICommonObject, IMultiModalOption, INodeData } from '../../../src'
import { addImagesToMessages } from '../../../src/multiModalUtils'

export class ChatOpenAI extends LangchainChatOpenAI {
    //TODO: Should be class variables and not static
    public static chainNodeData: INodeData
    public static chainNodeOptions: ICommonObject
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption?: IMultiModalOption

    constructor(
        fields?: Partial<OpenAIChatInput> & BaseChatModelParams & { openAIApiKey?: string; multiModalOption?: IMultiModalOption },
        /** @deprecated */
        configuration?: ClientOptions & LegacyOpenAIInput
    ) {
        super(fields, configuration)
        this.multiModalOption = fields?.multiModalOption
        this.configuredModel = fields?.modelName ?? 'gpt-3.5-turbo'
        this.configuredMaxToken = fields?.maxTokens
    }

    async invoke(input: BaseLanguageModelInput, options?: ChatOpenAICallOptions): Promise<BaseMessageChunk> {
        return super.invoke(input, options)
    }

    async generate(messages: BaseMessageLike[][], options?: string[] | ChatOpenAICallOptions, callbacks?: Callbacks): Promise<LLMResult> {
        if (ChatOpenAI.chainNodeData && ChatOpenAI.chainNodeOptions) {
            await this.injectMultiModalMessages(messages)
        }
        return super.generate(messages, options, callbacks)
    }

    private async injectMultiModalMessages(messages: BaseMessageLike[][]) {
        const nodeData = ChatOpenAI.chainNodeData
        const optionsData = ChatOpenAI.chainNodeOptions
        const messageContent = addImagesToMessages(nodeData, optionsData, this.multiModalOption)
        if (messageContent?.length) {
            if (messages[0].length > 0 && messages[0][messages[0].length - 1] instanceof HumanMessage) {
                const lastMessage = messages[0].pop()
                if (lastMessage instanceof HumanMessage) {
                    lastMessage.content = messageContent

                    // Change model to gpt-4-vision
                    this.modelName = 'gpt-4-vision-preview'

                    // Change default max token to higher when using gpt-4-vision
                    this.maxTokens = 1024
                }
                messages[0].push(lastMessage as HumanMessage)
            }
        } else {
            // revert to previous values if image upload is empty
            this.modelName = this.configuredModel
            this.maxTokens = this.configuredMaxToken
        }
    }
}
