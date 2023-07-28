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
        this.version = 1.0
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
                label: 'Prompt Key',
                name: 'promptKey',
                type: 'options',
                options: [
                    {
                        label: 'websearch',
                        name: 'websearch'
                    },
                    {
                        label: 'scifact',
                        name: 'scifact'
                    },
                    {
                        label: 'arguana',
                        name: 'arguana'
                    },
                    {
                        label: 'trec-covid',
                        name: 'trec-covid'
                    },
                    {
                        label: 'fiqa',
                        name: 'fiqa'
                    },
                    {
                        label: 'dbpedia-entity',
                        name: 'dbpedia-entity'
                    },
                    {
                        label: 'trec-news',
                        name: 'trec-news'
                    },
                    {
                        label: 'mr-tydi',
                        name: 'mr-tydi'
                    }
                ],
                default: 'websearch'
            },
            {
                label: 'Custom Prompt',
                name: 'customPrompt',
                description: 'If custom prompt is used, this will override Prompt Key',
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
        const k = topK ? parseInt(topK, 10) : 4

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
