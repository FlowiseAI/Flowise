import { VectorStore } from 'langchain/vectorstores/base'
import { INode, INodeData, INodeParams, HyDERetrieverInput } from '../../../src/Interface'
import { HydeRetriever } from 'langchain/retrievers/hyde'
import { BaseLanguageModel } from 'langchain/base_language'
import { Embeddings } from 'langchain/embeddings/base'

class HydeRetriever_Retrievers implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Hyde Retriever'
        this.name = 'HydeRetriever'
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
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
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
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const promptKey = nodeData.inputs?.promptKey as string
        const topK = nodeData.inputs?.topK as number

        const obj = {
            llm,
            vectorStore,
            embeddings,
            promptKey,
            topK
        } as HyDERetrieverInput

        const retriever = new HydeRetriever(obj)
        return retriever
    }
}

module.exports = { nodeClass: HydeRetriever_Retrievers }
