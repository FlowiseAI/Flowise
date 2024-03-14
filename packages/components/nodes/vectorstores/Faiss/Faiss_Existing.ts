import { FaissStore } from '@langchain/community/vectorstores/faiss'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class Faiss_Existing_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Faiss Load Existing Index'
        this.name = 'faissExistingIndex'
        this.version = 1.0
        this.type = 'Faiss'
        this.icon = 'faiss.svg'
        this.category = 'Vector Stores'
        this.description = 'Load existing index from Faiss (i.e: Document has been upserted)'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'DEPRECATING'
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Base Path to load',
                name: 'basePath',
                description: 'Path to load faiss.index file',
                placeholder: `C:\\Users\\User\\Desktop`,
                type: 'string'
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Faiss Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Faiss Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(FaissStore)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const basePath = nodeData.inputs?.basePath as string
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const vectorStore = await FaissStore.load(basePath, embeddings)

        // Avoid illegal invocation error
        vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number) => {
            const index = vectorStore.index

            if (k > index.ntotal()) {
                const total = index.ntotal()
                console.warn(`k (${k}) is greater than the number of elements in the index (${total}), setting k to ${total}`)
                k = total
            }

            const result = index.search(query, k)
            return result.labels.map((id, index) => {
                const uuid = vectorStore._mapping[id]
                return [vectorStore.docstore.search(uuid), result.distances[index]] as [Document, number]
            })
        }

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

module.exports = { nodeClass: Faiss_Existing_VectorStores }
