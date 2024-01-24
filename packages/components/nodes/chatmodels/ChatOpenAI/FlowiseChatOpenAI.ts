import { ChatOpenAI, OpenAIChatInput } from 'langchain/chat_models/openai'
import { BaseChatModelParams } from 'langchain/chat_models/base'
import type { ClientOptions } from 'openai'
import type { LegacyOpenAIInput } from '@langchain/openai/dist/types'
import { BaseLanguageModelInput } from 'langchain/base_language'
import { ChatOpenAICallOptions } from '@langchain/openai/dist/chat_models'
import { BaseMessageChunk, BaseMessageLike, HumanMessage, LLMResult } from 'langchain/schema'
import { Callbacks } from '@langchain/core/callbacks/manager'
import { ICommonObject, INodeData } from '../../../src'
import { addImagesToMessages, checkSpeechToText } from '../../../src/MultiModalUtils'
import { ChatPromptTemplate, PromptTemplate } from 'langchain/prompts'

export class FlowiseChatOpenAI extends ChatOpenAI {
    multiModal: {}
    //TODO: Should be class variables and not static
    public static chainNodeData: INodeData
    public static chainNodeOptions: ICommonObject

    constructor(
        fields?: Partial<OpenAIChatInput> & BaseChatModelParams & { openAIApiKey?: string },
        /** @deprecated */
        configuration?: ClientOptions & LegacyOpenAIInput
    ) {
        super(fields)
    }

    async invoke(input: BaseLanguageModelInput, options?: ChatOpenAICallOptions): Promise<BaseMessageChunk> {
        //input.messages
        return super.invoke(input, options)
    }

    async generate(messages: BaseMessageLike[][], options?: string[] | ChatOpenAICallOptions, callbacks?: Callbacks): Promise<LLMResult> {
        //messages
        await this.injectMultiModalMessages(messages)
        return super.generate(messages, options, callbacks)
    }

    private async injectMultiModalMessages(messages: BaseMessageLike[][]) {
        const nodeData = FlowiseChatOpenAI.chainNodeData
        const optionsData = FlowiseChatOpenAI.chainNodeOptions
        let audioTrans = await checkSpeechToText(nodeData, optionsData)
        if (audioTrans) {
            if (messages.length > 0) {
                const lastMessage = messages[0].pop() as HumanMessage
                if (!nodeData.inputs?.prompt) {
                    lastMessage.content = audioTrans
                } else if (nodeData.inputs?.prompt instanceof ChatPromptTemplate) {
                    lastMessage.content = audioTrans
                } else if (nodeData.inputs?.prompt instanceof PromptTemplate) {
                    let prompt = nodeData.inputs?.prompt as PromptTemplate
                    let inputVar = prompt.inputVariables[0]
                    let formattedValues: any = {}
                    formattedValues[inputVar] = audioTrans
                    lastMessage.content = await prompt.format(formattedValues)
                }
                messages[0].push(lastMessage)
            }
        }
        const messageContent = addImagesToMessages(nodeData, optionsData)
        if (messageContent) {
            if (messages[0].length > 0 && messages[0][messages[0].length - 1] instanceof HumanMessage) {
                const lastMessage = messages[0].pop()
                if (lastMessage instanceof HumanMessage) {
                    lastMessage.content = messageContent
                    this.modelName = 'gpt-4-vision-preview'
                }
                messages[0].push(lastMessage as HumanMessage)
            }
        }
    }
}
