import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { QdrantClient } from '@qdrant/js-client-rest'
import { QdrantVectorStore, QdrantLibArgs } from 'langchain/vectorstores/qdrant'
import { Embeddings } from 'langchain/embeddings/base'
import { getBaseClasses } from '../../../src/utils'

class Qdrant_Existing_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Qdrant Load Existing Index'
        this.name = 'qdrantExistingIndex'
        this.type = 'Qdrant'
        this.icon = 'qdrant_logo.svg'
        this.category = 'Vector Stores'
        this.description = 'Load existing index from Qdrant (i.e., documents have been upserted)'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Qdrant Server URL',
                name: 'qdrantServerUrl',
                type: 'string',
                placeholder: 'http://localhost:6333'
            },
            {
                label: 'Qdrant Collection Name',
                name: 'qdrantCollection',
                type: 'string'
            },
            {
                label: 'Qdrant API Key',
                name: 'qdrantApiKey',
                type: 'password',
                optional: true
            },
            {
                label: 'Qdrant Collection Cofiguration',
                name: 'qdrantCollectionCofiguration',
                type: 'json',
                optional: true,
                additionalParams: true
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
                label: 'Qdrant Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Qdrant Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(QdrantVectorStore)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const qdrantServerUrl = nodeData.inputs?.qdrantServerUrl as string
        const collectionName = nodeData.inputs?.qdrantCollection as string
        const qdrantApiKey = nodeData.inputs?.qdrantApiKey as string
        let qdrantCollectionCofiguration = nodeData.inputs?.qdrantCollectionCofiguration
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        // connect to Qdrant Cloud
        const client = new QdrantClient({
            url: qdrantServerUrl,
            apiKey: qdrantApiKey
        })

        const dbConfig: QdrantLibArgs = {
            client,
            collectionName
        }

        if (qdrantCollectionCofiguration) {
            qdrantCollectionCofiguration =
                typeof qdrantCollectionCofiguration === 'object' ? qdrantCollectionCofiguration : JSON.parse(qdrantCollectionCofiguration)
            dbConfig.collectionConfig = qdrantCollectionCofiguration
        }

        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, dbConfig)

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

module.exports = { nodeClass: Qdrant_Existing_VectorStores }
