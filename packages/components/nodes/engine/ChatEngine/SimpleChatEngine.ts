import { ICommonObject, IMessage, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { ChatMessage, SimpleChatEngine } from 'llamaindex'

class SimpleChatEngine_LlamaIndex implements INode {
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
        this.label = 'Simple Chat Engine'
        this.name = 'simpleChatEngine'
        this.version = 1.0
        this.type = 'SimpleChatEngine'
        this.icon = 'chat-engine.png'
        this.category = 'Engine'
        this.description = 'Simple engine to handle back and forth conversations'
        this.baseClasses = [this.type]
        this.tags = ['LlamaIndex']
        this.inputs = [
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel_LlamaIndex'
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
                placeholder: 'You are a helpful assistant'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model
        const memory = nodeData.inputs?.memory

        const chatEngine = new SimpleChatEngine({ llm: model })
        ;(chatEngine as any).memory = memory
        return chatEngine
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const chatEngine = nodeData.instance as SimpleChatEngine
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

module.exports = { nodeClass: SimpleChatEngine_LlamaIndex }
