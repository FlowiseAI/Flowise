import { ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ConversationalRetrievalQAChain } from 'langchain/chains'
import { BaseLLM } from 'langchain/llms/base'
import { BaseRetriever } from 'langchain/schema'

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
        this.baseClasses = [this.type, ...getBaseClasses(ConversationalRetrievalQAChain)]
        this.inputs = [
            {
                label: 'LLM',
                name: 'llm',
                type: 'BaseLLM'
            },
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const llm = nodeData.inputs?.llm as BaseLLM
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as BaseRetriever

        const chain = ConversationalRetrievalQAChain.fromLLM(llm, vectorStoreRetriever)
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const chain = nodeData.instance as ConversationalRetrievalQAChain
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
