import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { getBaseClasses } from '../../../src/utils'
import { flatten } from 'lodash'

class InMemoryVectorStore_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'In-Memory Vector Store'
        this.name = 'memoryVectorStore'
        this.version = 1.0
        this.type = 'Memory'
        this.icon = 'memory.svg'
        this.category = 'Vector Stores'
        this.description = 'In-memory vectorstore that stores embeddings and does an exact, linear search for the most similar embeddings.'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Memory Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Memory Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(MemoryVectorStore)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const vectorStore = await MemoryVectorStore.fromDocuments(finalDocs, embeddings)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: InMemoryVectorStore_VectorStores }
