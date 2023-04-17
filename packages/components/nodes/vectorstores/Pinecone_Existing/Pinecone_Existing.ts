import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { PineconeClient } from '@pinecone-database/pinecone'
import { PineconeStore } from 'langchain/vectorstores/pinecone'
import { Embeddings } from 'langchain/embeddings/base'

class Pinecone_Existing_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Pinecone Load Existing Index'
        this.name = 'pineconeExistingIndex'
        this.type = 'Pinecone'
        this.icon = 'pinecone.png'
        this.category = 'Vector Stores'
        this.description = 'Load existing index from Pinecone (i.e: Document has been upserted)'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Pinecone Api Key',
                name: 'pineconeApiKey',
                type: 'password'
            },
            {
                label: 'Pinecone Environment',
                name: 'pineconeEnv',
                type: 'string'
            },
            {
                label: 'Pinecone Index',
                name: 'pineconeIndex',
                type: 'string'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const pineconeApiKey = nodeData.inputs?.pineconeApiKey as string
        const pineconeEnv = nodeData.inputs?.pineconeEnv as string
        const index = nodeData.inputs?.pineconeIndex as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings

        const client = new PineconeClient()
        await client.init({
            apiKey: pineconeApiKey,
            environment: pineconeEnv
        })

        const pineconeIndex = client.Index(index)

        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex
        })
        const retriever = vectorStore.asRetriever()
        return retriever
    }
}

module.exports = { nodeClass: Pinecone_Existing_VectorStores }
