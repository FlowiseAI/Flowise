import { ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { ConversationChain } from 'langchain/chains'
import { getBaseClasses } from '../../../src/utils'
import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from 'langchain/prompts'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'
import { BaseChatModel } from 'langchain/chat_models/base'
import { AIChatMessage, HumanChatMessage } from 'langchain/schema'

const systemMessage = `The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.`

class ConversationChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Conversation Chain'
        this.name = 'conversationChain'
        this.type = 'ConversationChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'Chat models specific conversational chain with memory'
        this.baseClasses = [this.type, ...getBaseClasses(ConversationChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Memory',
                name: 'memory',
                type: 'BaseMemory'
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
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseChatModel
        const memory = nodeData.inputs?.memory as BufferMemory
        const prompt = nodeData.inputs?.systemMessagePrompt as string

        const obj: any = {
            llm: model,
            memory
        }

        const chatPrompt = ChatPromptTemplate.fromPromptMessages([
            SystemMessagePromptTemplate.fromTemplate(prompt ? `${prompt}\n${systemMessage}` : systemMessage),
            new MessagesPlaceholder(memory.memoryKey ?? 'chat_history'),
            HumanMessagePromptTemplate.fromTemplate('{input}')
        ])
        obj.prompt = chatPrompt

        const chain = new ConversationChain(obj)
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const chain = nodeData.instance as ConversationChain
        const memory = nodeData.inputs?.memory as BufferMemory

        if (options && options.chatHistory) {
            const chatHistory = []
            const histories: IMessage[] = options.chatHistory

            for (const message of histories) {
                if (message.type === 'apiMessage') {
                    chatHistory.push(new AIChatMessage(message.message))
                } else if (message.type === 'userMessage') {
                    chatHistory.push(new HumanChatMessage(message.message))
                }
            }
            memory.chatHistory = new ChatMessageHistory(chatHistory)
            chain.memory = memory
        }

        const res = await chain.call({ input })
        return res?.response
    }
}

module.exports = { nodeClass: ConversationChain_Chains }
