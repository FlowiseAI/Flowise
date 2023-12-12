import { VectorStore } from 'langchain/vectorstores/base'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { HydeRetriever, HydeRetrieverOptions, PromptKey } from 'langchain/retrievers/hyde'
import { BaseLanguageModel } from 'langchain/base_language'
import { PromptTemplate } from 'langchain/prompts'

class HydeRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Hyde Retriever'
        this.name = 'HydeRetriever'
        this.version = 2.0
        this.type = 'HydeRetriever'
        this.icon = 'hyderetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Use HyDE retriever to retrieve from a vector store'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Vector Store',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Select Defined Prompt',
                name: 'promptKey',
                description: 'Select a pre-defined prompt',
                type: 'options',
                options: [
                    {
                        label: 'websearch',
                        name: 'websearch',
                        description: `Please write a passage to answer the question
Question: {question}
Passage:`
                    },
                    {
                        label: 'scifact',
                        name: 'scifact',
                        description: `Please write a scientific paper passage to support/refute the claim
Claim: {question}
Passage:`
                    },
                    {
                        label: 'arguana',
                        name: 'arguana',
                        description: `Please write a counter argument for the passage
Passage: {question}
Counter Argument:`
                    },
                    {
                        label: 'trec-covid',
                        name: 'trec-covid',
                        description: `Please write a scientific paper passage to answer the question
Question: {question}
Passage:`
                    },
                    {
                        label: 'fiqa',
                        name: 'fiqa',
                        description: `Please write a financial article passage to answer the question
Question: {question}
Passage:`
                    },
                    {
                        label: 'dbpedia-entity',
                        name: 'dbpedia-entity',
                        description: `Please write a passage to answer the question.
Question: {question}
Passage:`
                    },
                    {
                        label: 'trec-news',
                        name: 'trec-news',
                        description: `Please write a news passage about the topic.
Topic: {question}
Passage:`
                    },
                    {
                        label: 'mr-tydi',
                        name: 'mr-tydi',
                        description: `Please write a passage in Swahili/Korean/Japanese/Bengali to answer the question in detail.
Question: {question}
Passage:`
                    }
                ],
                default: 'websearch'
            },
            {
                label: 'Custom Prompt',
                name: 'customPrompt',
                description: 'If custom prompt is used, this will override Defined Prompt',
                placeholder: 'Please write a passage to answer the question\nQuestion: {question}\nPassage:',
                type: 'string',
                rows: 4,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                default: 4,
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const llm = nodeData.inputs?.model as BaseLanguageModel
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore
        const promptKey = nodeData.inputs?.promptKey as PromptKey
        const customPrompt = nodeData.inputs?.customPrompt as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const obj: HydeRetrieverOptions<any> = {
            llm,
            vectorStore,
            k
        }

        if (customPrompt) obj.promptTemplate = PromptTemplate.fromTemplate(customPrompt)
        else if (promptKey) obj.promptTemplate = promptKey

        const retriever = new HydeRetriever(obj)
        return retriever
    }
}

module.exports = { nodeClass: HydeRetriever_Retrievers }
