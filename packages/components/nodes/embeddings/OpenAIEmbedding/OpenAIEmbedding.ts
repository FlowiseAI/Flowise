import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class OpenAIEmbedding_Embeddings implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAI Embeddings'
        this.name = 'openAIEmbeddings'
        this.type = 'OpenAIEmbeddings'
        this.icon = 'openai.png'
        this.category = 'Embeddings'
        this.description = 'OpenAI API to generate embeddings for a given text'
        this.inputs = [
            {
                label: 'OpenAI Api Key',
                name: 'openAIApiKey',
                type: 'password'
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        const { OpenAIEmbeddings } = await import('langchain/embeddings')
        return getBaseClasses(OpenAIEmbeddings)
    }

    async init(nodeData: INodeData): Promise<any> {
        const { OpenAIEmbeddings } = await import('langchain/embeddings')
        const openAIApiKey = nodeData.inputs?.openAIApiKey as string

        const model = new OpenAIEmbeddings({ openAIApiKey })
        return model
    }
}

module.exports = { nodeClass: OpenAIEmbedding_Embeddings }
