import { ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class ConversationalRetrievalQAChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Conversational Retrieval QA Chain'
        this.name = 'conversationalRetrievalQAChain'
        this.type = 'ConversationalRetrievalQAChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'Document QA - built on RetrievalQAChain to provide a chat history component'
        this.inputs = [
            {
                label: 'LLM',
                name: 'llm',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        const { ConversationalRetrievalQAChain } = await import('langchain/chains')
        return getBaseClasses(ConversationalRetrievalQAChain)
    }

    async init(nodeData: INodeData): Promise<any> {
        const { ConversationalRetrievalQAChain } = await import('langchain/chains')

        const llm = nodeData.inputs?.llm
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever

        const chain = ConversationalRetrievalQAChain.fromLLM(llm, vectorStoreRetriever)
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const chain = nodeData.instance
        let chatHistory = ''

        if (options && options.chatHistory) {
            const histories: IMessage[] = options.chatHistory
            chatHistory = histories
                .map((item) => {
                    return item.message
                })
                .join('')
        }

        const obj = {
            question: input,
            chat_history: chatHistory ? chatHistory : []
        }

        const res = await chain.call(obj)

        return res?.text
    }
}

module.exports = { nodeClass: ConversationalRetrievalQAChain_Chains }
