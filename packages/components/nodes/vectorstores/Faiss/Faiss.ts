import { flatten } from 'lodash'
import { Document } from '@langchain/core/documents'
import { FaissStore } from '@langchain/community/vectorstores/faiss'
import { Embeddings } from '@langchain/core/embeddings'
import { INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class Faiss_VectorStores implements INode {
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
        this.label = 'Faiss'
        this.name = 'faiss'
        this.version = 1.0
        this.type = 'Faiss'
        this.icon = 'faiss.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert embedded data and perform similarity search upon query using Faiss library from Meta'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
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

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData): Promise<Partial<IndexingResult>> {
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const basePath = nodeData.inputs?.basePath as string

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            try {
                const vectorStore = await FaissStore.fromDocuments(finalDocs, embeddings)
                await vectorStore.save(basePath)

                // Avoid illegal invocation error
                vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number) => {
                    return await similaritySearchVectorWithScore(query, k, vectorStore)
                }

                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
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
            return await similaritySearchVectorWithScore(query, k, vectorStore)
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

const similaritySearchVectorWithScore = async (query: number[], k: number, vectorStore: FaissStore) => {
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

module.exports = { nodeClass: Faiss_VectorStores }
