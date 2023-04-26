import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { CohereEmbeddings } from 'langchain/embeddings/cohere'

class CohereEmbedding_Embeddings implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Cohere Embeddings'
        this.name = 'cohereEmbeddings'
        this.type = 'CohereEmbeddings'
        this.icon = 'cohere.png'
        this.category = 'Embeddings'
        this.description = 'Cohere API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(CohereEmbeddings)]
        this.inputs = [
            {
                label: 'Cohere API Key',
                name: 'cohereApiKey',
                type: 'password'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const apiKey = nodeData.inputs?.cohereApiKey as string

        const model = new CohereEmbeddings({ apiKey })
        return model
    }

    jsCodeImport(): string {
        return `import { CohereEmbeddings } from 'langchain/embeddings/cohere'`
    }

    jsCode(nodeData: INodeData): string {
        const apiKey = nodeData.inputs?.cohereApiKey as string
        const code = `new CohereEmbeddings({ apiKey: "${apiKey}" })`
        return code
    }
}

module.exports = { nodeClass: CohereEmbedding_Embeddings }
