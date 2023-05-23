import { BaseLanguageModel } from 'langchain/base_language'
import { ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ConversationalRetrievalQAChain } from 'langchain/chains'
import { BaseRetriever } from 'langchain/schema'

const default_qa_template = `Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.

{context}

Question: {question}
Helpful Answer:`

const qa_template = `Use the following pieces of context to answer the question at the end.

{context}

Question: {question}
Helpful Answer:`

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
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            },
            {
                label: 'System Message',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                additionalParams: true,
                optional: true,
                placeholder:
                    'I want you to act as a document that I am having a conversation with. Your name is "AI Assistant". You will provide me with answers from the given info. If the answer is not included, say exactly "Hmm, I am not sure." and stop after that. Refuse to answer any question not about the info. Never break character.'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as BaseRetriever
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string

        const chain = ConversationalRetrievalQAChain.fromLLM(model, vectorStoreRetriever, {
            verbose: process.env.DEBUG === 'true' ? true : false,
            qaTemplate: systemMessagePrompt ? `${systemMessagePrompt}\n${qa_template}` : default_qa_template
        })
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
