import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { ConversationChain } from 'langchain/chains'
import { getBaseClasses } from '../../../src/utils'
import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from 'langchain/prompts'
import { BaseChatModel } from 'langchain/chat_models/base'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { flatten } from 'lodash'
import { Document } from 'langchain/document'
import { RunnableSequence } from 'langchain/schema/runnable'
import { StringOutputParser } from 'langchain/schema/output_parser'

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
        this.version = 1.0
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
                label: 'Document',
                name: 'document',
                type: 'Document',
                description:
                    'Include whole document into the context window, if you get maximum context length error, please use model with higher context window like Claude 100k, or gpt4 32k',
                optional: true,
                list: true
            },
            {
                label: 'System Message',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                additionalParams: true,
                optional: true,
                placeholder: 'You are a helpful assistant that write codes'
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const chain = prepareChain(nodeData, this.sessionId, options.chatHistory)
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const memory = nodeData.inputs?.memory
        const chain = prepareChain(nodeData, this.sessionId, options.chatHistory)

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        let res = ''

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            res = await chain.invoke({ input }, { callbacks: [loggerHandler, handler, ...callbacks] })
        } else {
            res = await chain.invoke({ input }, { callbacks: [loggerHandler, ...callbacks] })
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
    const docs = nodeData.inputs?.document as Document[]

    const flattenDocs = docs && docs.length ? flatten(docs) : []
    const finalDocs = []
    for (let i = 0; i < flattenDocs.length; i += 1) {
        if (flattenDocs[i] && flattenDocs[i].pageContent) {
            finalDocs.push(new Document(flattenDocs[i]))
        }
    }

    let finalText = ''
    for (let i = 0; i < finalDocs.length; i += 1) {
        finalText += finalDocs[i].pageContent
    }

    const replaceChar: string[] = ['{', '}']
    for (const char of replaceChar) finalText = finalText.replaceAll(char, '')

    if (finalText) systemMessage = `${systemMessage}\nThe AI has the following context:\n${finalText}`

    const chatPrompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(prompt ? `${prompt}\n${systemMessage}` : systemMessage),
        new MessagesPlaceholder(memory.memoryKey ?? 'chat_history'),
        HumanMessagePromptTemplate.fromTemplate(`{${inputKey}}`)
    ])

    return chatPrompt
}

const prepareChain = (nodeData: INodeData, sessionId?: string, chatHistory: IMessage[] = []) => {
    const model = nodeData.inputs?.model as BaseChatModel
    const memory = nodeData.inputs?.memory as FlowiseMemory
    const memoryKey = memory.memoryKey ?? 'chat_history'

    const conversationChain = RunnableSequence.from([
        {
            [inputKey]: (input: { input: string }) => input.input,
            [memoryKey]: async () => {
                const history = await memory.getChatMessages(sessionId, true, chatHistory)
                return history
            }
        },
        prepareChatPrompt(nodeData),
        model,
        new StringOutputParser()
    ])

    return conversationChain
}

module.exports = { nodeClass: ConversationChain_Chains }
