import { VectorStore } from 'langchain/vectorstores/base'
import { INode, INodeData, INodeParams, VectorStoreRetriever, VectorStoreRetrieverInput } from '../../../src/Interface'

class VectorStoreRetriever_Retrievers implements INode {
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
        this.label = 'Vector Store Retriever'
        this.name = 'vectorStoreRetriever'
        this.version = 1.0
        this.type = 'VectorStoreRetriever'
        this.icon = 'vectorretriever.svg'
        this.category = 'Retrievers'
        this.description = 'Store vector store as retriever to be later queried by MultiRetrievalQAChain'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Vector Store',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Retriever Name',
                name: 'name',
                type: 'string',
                placeholder: 'netflix movies'
            },
            {
                label: 'Retriever Description',
                name: 'description',
                type: 'string',
                rows: 3,
                description: 'Description of when to use the vector store retriever',
                placeholder: 'Good for answering questions about netflix movies'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const name = nodeData.inputs?.name as string
        const description = nodeData.inputs?.description as string
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore

        const obj = {
            name,
            description,
            vectorStore
        } as VectorStoreRetrieverInput

        const retriever = new VectorStoreRetriever(obj)
        return retriever
    }
}

module.exports = { nodeClass: VectorStoreRetriever_Retrievers }
