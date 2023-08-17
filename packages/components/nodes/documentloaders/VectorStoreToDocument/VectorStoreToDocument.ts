import { VectorStore } from 'langchain/vectorstores/base'
import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src/utils'

class VectorStoreToDocument_DocumentLoaders implements INode {
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
        this.label = 'VectorStore To Document'
        this.name = 'vectorStoreToDocument'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'vectorretriever.svg'
        this.category = 'Document Loaders'
        this.description = 'Search documents with scores from vector store'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Vector Store',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Minimum Score (%)',
                name: 'minScore',
                type: 'number',
                optional: true,
                placeholder: '75',
                step: 1,
                description: 'Minumum score for embeddings documents to be included'
            }
        ]
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                baseClasses: this.baseClasses
            },
            {
                label: 'Text',
                name: 'text',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string): Promise<any> {
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore
        const minScore = nodeData.inputs?.minScore as number
        const output = nodeData.outputs?.output as string

        const topK = (vectorStore as any)?.k ?? 4

        const docs = await vectorStore.similaritySearchWithScore(input, topK)
        // eslint-disable-next-line no-console
        console.log('\x1b[94m\x1b[1m\n*****VectorStore Documents*****\n\x1b[0m\x1b[0m')
        // eslint-disable-next-line no-console
        console.log(docs)

        if (output === 'document') {
            let finaldocs = []
            for (const doc of docs) {
                if (minScore && doc[1] < minScore / 100) continue
                finaldocs.push(doc[0])
            }
            return finaldocs
        } else {
            let finaltext = ''
            for (const doc of docs) {
                if (minScore && doc[1] < minScore / 100) continue
                finaltext += `${doc[0].pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }
}

module.exports = { nodeClass: VectorStoreToDocument_DocumentLoaders }
