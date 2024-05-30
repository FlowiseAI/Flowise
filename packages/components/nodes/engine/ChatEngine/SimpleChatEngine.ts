import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { LLM, ChatMessage, SimpleChatEngine } from 'llamaindex'

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
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
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
        this.sessionId = fields?.sessionId
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const model = nodeData.inputs?.model as LLM
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const prependMessages = options?.prependMessages

        const chatHistory = [] as ChatMessage[]

        if (systemMessagePrompt) {
            chatHistory.push({
                content: systemMessagePrompt,
                role: 'user'
            })
        }

        const chatEngine = new SimpleChatEngine({ llm: model })

        const msgs = (await memory.getChatMessages(this.sessionId, false, prependMessages)) as IMessage[]
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

        let text = ''
        let isStreamingStarted = false
        const isStreamingEnabled = options.socketIO && options.socketIOClientId

        if (isStreamingEnabled) {
            const stream = await chatEngine.chat({ message: input, chatHistory, stream: true })
            for await (const chunk of stream) {
                text += chunk.response
                if (!isStreamingStarted) {
                    isStreamingStarted = true
                    options.socketIO.to(options.socketIOClientId).emit('start', chunk.response)
                }

                options.socketIO.to(options.socketIOClientId).emit('token', chunk.response)
            }
        } else {
            const response = await chatEngine.chat({ message: input, chatHistory })
            text = response?.response
        }

        await memory.addChatMessages(
            [
                {
                    text: input,
                    type: 'userMessage'
                },
                {
                    text: text,
                    type: 'apiMessage'
                }
            ],
            this.sessionId
        )

        return text
    }
}

module.exports = { nodeClass: SimpleChatEngine_LlamaIndex }
