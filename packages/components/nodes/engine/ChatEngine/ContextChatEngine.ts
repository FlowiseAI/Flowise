import { ICommonObject, IMessage, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { ContextChatEngine, ChatMessage } from 'llamaindex'

class ContextChatEngine_LlamaIndex implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Context Chat Engine'
        this.name = 'contextChatEngine'
        this.version = 1.0
        this.type = 'ContextChatEngine'
        this.icon = 'context-chat-engine.png'
        this.category = 'Engine'
        this.description = 'Answer question based on retrieved documents (context) with built-in memory to remember conversation'
        this.baseClasses = [this.type]
        this.tags = ['LlamaIndex']
        this.inputs = [
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel_LlamaIndex'
            },
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'VectorIndexRetriever'
            },
            {
                label: 'Memory',
                name: 'memory',
                type: 'BaseChatMemory'
            },
            {
                label: 'System Message',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                optional: true,
                placeholder:
                    'I want you to act as a document that I am having a conversation with. Your name is "AI Assistant". You will provide me with answers from the given info. If the answer is not included, say exactly "Hmm, I am not sure." and stop after that. Refuse to answer any question not about the info. Never break character.'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever
        const memory = nodeData.inputs?.memory

        const chatEngine = new ContextChatEngine({ chatModel: model, retriever: vectorStoreRetriever })
        ;(chatEngine as any).memory = memory
        return chatEngine
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const chatEngine = nodeData.instance as ContextChatEngine
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        const memory = nodeData.inputs?.memory

        const chatHistory = [] as ChatMessage[]

        let sessionId = ''
        if (memory) {
            if (memory.isSessionIdUsingChatMessageId) sessionId = options.chatId
            else sessionId = nodeData.inputs?.sessionId
        }

        if (systemMessagePrompt) {
            chatHistory.push({
                content: systemMessagePrompt,
                role: 'user'
            })
        }

        /* When incomingInput.history is provided, only force replace chatHistory if its ShortTermMemory
         * LongTermMemory will automatically retrieved chatHistory from sessionId
         */
        if (options && options.chatHistory && memory.isShortTermMemory) {
            await memory.resumeMessages(options.chatHistory)
        }

        const msgs: IMessage[] = await memory.getChatMessages(sessionId)
        for (const message of msgs) {
            if (message.type === 'apiMessage') {
                chatHistory.push({
                    content: message.message,
                    role: 'assistant'
                })
            } else if (message.type === 'userMessage') {
                chatHistory.push({
                    content: message.message,
                    role: 'user'
                })
            }
        }

        if (options.socketIO && options.socketIOClientId) {
            let response = ''
            const stream = await chatEngine.chat(input, chatHistory, true)
            let isStart = true
            const onNextPromise = () => {
                return new Promise((resolve, reject) => {
                    const onNext = async () => {
                        try {
                            const { value, done } = await stream.next()
                            if (!done) {
                                if (isStart) {
                                    options.socketIO.to(options.socketIOClientId).emit('start')
                                    isStart = false
                                }
                                options.socketIO.to(options.socketIOClientId).emit('token', value)
                                response += value
                                onNext()
                            } else {
                                resolve(response)
                            }
                        } catch (error) {
                            reject(error)
                        }
                    }
                    onNext()
                })
            }

            try {
                const result = await onNextPromise()
                if (memory) {
                    await memory.addChatMessages(
                        [
                            {
                                text: input,
                                type: 'userMessage'
                            },
                            {
                                text: result,
                                type: 'apiMessage'
                            }
                        ],
                        sessionId
                    )
                }
                return result as string
            } catch (error) {
                throw new Error(error)
            }
        } else {
            const response = await chatEngine.chat(input, chatHistory)
            if (memory) {
                await memory.addChatMessages(
                    [
                        {
                            text: input,
                            type: 'userMessage'
                        },
                        {
                            text: response?.response,
                            type: 'apiMessage'
                        }
                    ],
                    sessionId
                )
            }
            return response?.response
        }
    }
}

module.exports = { nodeClass: ContextChatEngine_LlamaIndex }
