import { INode, INodeData, INodeParams } from '../../../src/Interface'

class ChromaUpsert_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Chroma Upsert Document'
        this.name = 'chromaUpsert'
        this.type = 'Chroma'
        this.icon = 'chroma.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to Chroma'
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
                label: 'Collection Name',
                name: 'collectionName',
                type: 'string'
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        return ['BaseRetriever']
    }

    async init(nodeData: INodeData): Promise<any> {
        const { Chroma } = await import('langchain/vectorstores')
        const { Document } = await import('langchain/document')

        const collectionName = nodeData.inputs?.collectionName as string
        const docs = nodeData.inputs?.document
        const embeddings = nodeData.inputs?.embeddings

        const finalDocs = []
        for (let i = 0; i < docs.length; i += 1) {
            finalDocs.push(new Document(docs[i]))
        }

        const result = await Chroma.fromDocuments(finalDocs, embeddings, {
            collectionName
        })

        const retriever = result.asRetriever()
        return retriever
    }
}

module.exports = { nodeClass: ChromaUpsert_VectorStores }
