import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { Chroma } from 'langchain/vectorstores/chroma'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'

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
        this.baseClasses = [this.type, 'BaseRetriever']
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

    async init(nodeData: INodeData): Promise<any> {
        const collectionName = nodeData.inputs?.collectionName as string
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings

        const finalDocs = []
        for (let i = 0; i < docs.length; i += 1) {
            finalDocs.push(new Document(docs[i]))
        }

        const vectorStore = await Chroma.fromDocuments(finalDocs, embeddings, {
            collectionName
        })
        const retriever = vectorStore.asRetriever()
        return retriever
    }
}

module.exports = { nodeClass: ChromaUpsert_VectorStores }
