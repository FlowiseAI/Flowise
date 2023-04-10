import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { PineconeClient } from '@pinecone-database/pinecone'

class PineconeUpsert_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Pinecone Upsert Document'
        this.name = 'pineconeUpsert'
        this.type = 'Pinecone'
        this.icon = 'pinecone.png'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to Pinecone'
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document'
            },
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

    async getBaseClasses(): Promise<string[]> {
        return ['BaseRetriever']
    }

    async init(nodeData: INodeData): Promise<any> {
        const { PineconeStore } = await import('langchain/vectorstores')
        const { Document } = await import('langchain/document')

        const pineconeApiKey = nodeData.inputs?.pineconeApiKey as string
        const pineconeEnv = nodeData.inputs?.pineconeEnv as string
        const index = nodeData.inputs?.pineconeIndex as string
        const docs = nodeData.inputs?.document
        const embeddings = nodeData.inputs?.embeddings

        const client = new PineconeClient()
        await client.init({
            apiKey: pineconeApiKey,
            environment: pineconeEnv
        })

        const pineconeIndex = client.Index(index)

        const finalDocs = []
        for (let i = 0; i < docs.length; i += 1) {
            finalDocs.push(new Document(docs[i]))
        }

        const result = await PineconeStore.fromDocuments(finalDocs, embeddings, {
            pineconeIndex
        })

        const retriever = result.asRetriever()
        return retriever
    }
}

module.exports = { nodeClass: PineconeUpsert_VectorStores }
