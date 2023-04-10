import { INode, INodeData, INodeParams } from '../../../src/Interface'

class Chroma_Existing_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Chroma Load Existing Index'
        this.name = 'chromaExistingIndex'
        this.type = 'Chroma'
        this.icon = 'chroma.svg'
        this.category = 'Vector Stores'
        this.description = 'Load existing index from Chroma (i.e: Document has been upserted)'
        this.inputs = [
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

        const collectionName = nodeData.inputs?.collectionName as string
        const embeddings = nodeData.inputs?.embeddings

        const vectorStore = await Chroma.fromExistingCollection(embeddings, {
            collectionName
        })
        const retriever = vectorStore.asRetriever()
        return retriever
    }
}

module.exports = { nodeClass: Chroma_Existing_VectorStores }
