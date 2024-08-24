import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Metadata, BaseRetriever, LLM, ContextChatEngine, ChatMessage, NodeWithScore } from 'llamaindex'
import { reformatSourceDocuments } from '../EngineUtils'

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
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
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
                label: 'Return Source Documents',
                name: 'returnSourceDocuments',
                type: 'boolean',
                optional: true
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
        this.sessionId = fields?.sessionId
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        const model = nodeData.inputs?.model as LLM
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as BaseRetriever
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean
        const prependMessages = options?.prependMessages

        const chatHistory = [] as ChatMessage[]

        if (systemMessagePrompt) {
            chatHistory.push({
                content: systemMessagePrompt,
                role: 'user'
            })
        }

        const chatEngine = new ContextChatEngine({ chatModel: model, retriever: vectorStoreRetriever })

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
        let sourceDocuments: ICommonObject[] = []
        let sourceNodes: NodeWithScore<Metadata>[] = []
        const isStreamingEnabled = options.socketIO && options.socketIOClientId

        if (isStreamingEnabled) {
            const stream = await chatEngine.chat({ message: input, chatHistory, stream: true })
            for await (const chunk of stream) {
                text += chunk.response
                if (chunk.sourceNodes) sourceNodes = chunk.sourceNodes
                if (!isStreamingStarted) {
                    isStreamingStarted = true
                    options.socketIO.to(options.socketIOClientId).emit('start', chunk.response)
                }

                options.socketIO.to(options.socketIOClientId).emit('token', chunk.response)
            }

            if (returnSourceDocuments) {
                sourceDocuments = reformatSourceDocuments(sourceNodes)
                options.socketIO.to(options.socketIOClientId).emit('sourceDocuments', sourceDocuments)
            }
        } else {
            const response = await chatEngine.chat({ message: input, chatHistory })
            text = response?.response
            sourceDocuments = reformatSourceDocuments(response?.sourceNodes ?? [])
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

        if (returnSourceDocuments) return { text, sourceDocuments }
        else return { text }
    }
}

module.exports = { nodeClass: ContextChatEngine_LlamaIndex }
