import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { ConversationChain } from 'langchain/chains'
import { getBaseClasses, handleEscapeCharacters } from '../../../src/utils'
import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from 'langchain/prompts'
import { BaseChatModel } from 'langchain/chat_models/base'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { RunnableSequence } from 'langchain/schema/runnable'
import { StringOutputParser } from 'langchain/schema/output_parser'
import { ConsoleCallbackHandler as LCConsoleCallbackHandler } from '@langchain/core/tracers/console'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

let systemMessage = `The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.`
const inputKey = 'input'

class ConversationChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'Conversation Chain'
        this.name = 'conversationChain'
        this.version = 3.0
        this.type = 'ConversationChain'
        this.icon = 'conv.svg'
        this.category = 'Chains'
        this.description = 'Chat models specific conversational chain with memory'
        this.baseClasses = [this.type, ...getBaseClasses(ConversationChain)]
        this.inputs = [
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Memory',
                name: 'memory',
                type: 'BaseMemory'
            },
            {
                label: 'Chat Prompt Template',
                name: 'chatPromptTemplate',
                type: 'ChatPromptTemplate',
                description: 'Override existing prompt with Chat Prompt Template. Human Message must includes {input} variable',
                optional: true
            },
            /* Deprecated
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                description:
                    'Include whole document into the context window, if you get maximum context length error, please use model with higher context window like Claude 100k, or gpt4 32k',
                optional: true,
                list: true
            },*/
            {
                label: 'Input Moderation',
                description: 'Detect text that could generate harmful output and prevent it from being sent to the language model',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            },
            {
                label: 'System Message',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                description: 'If Chat Prompt Template is provided, this will be ignored',
                additionalParams: true,
                optional: true,
                default: systemMessage,
                placeholder: systemMessage
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const chain = prepareChain(nodeData, this.sessionId, options.chatHistory)
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const memory = nodeData.inputs?.memory
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the LLM chain
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                streamResponse(options.socketIO && options.socketIOClientId, e.message, options.socketIO, options.socketIOClientId)
                return formatResponse(e.message)
            }
        }

        const chain = prepareChain(nodeData, this.sessionId, options.chatHistory)

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const additionalCallback = await additionalCallbacks(nodeData, options)

        let res = ''
        let callbacks = [loggerHandler, ...additionalCallback]

        if (process.env.DEBUG === 'true') {
            callbacks.push(new LCConsoleCallbackHandler())
        }

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            callbacks.push(handler)
            res = await chain.invoke({ input }, { callbacks })
        } else {
            res = await chain.invoke({ input }, { callbacks })
        }

        await memory.addChatMessages(
            [
                {
                    text: input,
                    type: 'userMessage'
                },
                {
                    text: res,
                    type: 'apiMessage'
                }
            ],
            this.sessionId
        )

        return res
    }
}

const prepareChatPrompt = (nodeData: INodeData) => {
    const memory = nodeData.inputs?.memory as FlowiseMemory
    const prompt = nodeData.inputs?.systemMessagePrompt as string
    const chatPromptTemplate = nodeData.inputs?.chatPromptTemplate as ChatPromptTemplate

    if (chatPromptTemplate && chatPromptTemplate.promptMessages.length) {
        const sysPrompt = chatPromptTemplate.promptMessages[0]
        const humanPrompt = chatPromptTemplate.promptMessages[chatPromptTemplate.promptMessages.length - 1]
        const chatPrompt = ChatPromptTemplate.fromMessages([
            sysPrompt,
            new MessagesPlaceholder(memory.memoryKey ?? 'chat_history'),
            humanPrompt
        ])

        if ((chatPromptTemplate as any).promptValues) {
            // @ts-ignore
            chatPrompt.promptValues = (chatPromptTemplate as any).promptValues
        }

        return chatPrompt
    }

    const chatPrompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(prompt ? prompt : systemMessage),
        new MessagesPlaceholder(memory.memoryKey ?? 'chat_history'),
        HumanMessagePromptTemplate.fromTemplate(`{${inputKey}}`)
    ])

    return chatPrompt
}

const prepareChain = (nodeData: INodeData, sessionId?: string, chatHistory: IMessage[] = []) => {
    const model = nodeData.inputs?.model as BaseChatModel
    const memory = nodeData.inputs?.memory as FlowiseMemory
    const memoryKey = memory.memoryKey ?? 'chat_history'

    const chatPrompt = prepareChatPrompt(nodeData)
    let promptVariables = {}
    const promptValuesRaw = (chatPrompt as any).promptValues
    if (promptValuesRaw) {
        const promptValues = handleEscapeCharacters(promptValuesRaw, true)
        for (const val in promptValues) {
            promptVariables = {
                ...promptVariables,
                [val]: () => {
                    return promptValues[val]
                }
            }
        }
    }

    const conversationChain = RunnableSequence.from([
        {
            [inputKey]: (input: { input: string }) => input.input,
            [memoryKey]: async () => {
                const history = await memory.getChatMessages(sessionId, true, chatHistory)
                return history
            },
            ...promptVariables
        },
        chatPrompt,
        model,
        new StringOutputParser()
    ])

    return conversationChain
}

module.exports = { nodeClass: ConversationChain_Chains }
