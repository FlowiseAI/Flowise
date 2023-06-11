import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { OpenAIEmbeddings, OpenAIEmbeddingsParams } from 'langchain/embeddings/openai'

class LocalAIEmbedding_Embeddings implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'LocalAI Embeddings'
        this.name = 'localAIEmbeddings'
        this.type = 'LocalAI Embeddings'
        this.icon = 'localai.png'
        this.category = 'Embeddings'
        this.description = 'Use local embeddings models like llama.cpp'
        this.baseClasses = [this.type, 'Embeddings']
        this.inputs = [
            {
                label: 'Base Path',
                name: 'basePath',
                type: 'string',
                placeholder: 'http://localhost:8080/v1'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: 'text-embedding-ada-002'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const basePath = nodeData.inputs?.basePath as string

        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string } = {
            modelName,
            openAIApiKey: 'sk-'
        }

        const model = new OpenAIEmbeddings(obj, { basePath })

        return model
    }
}

module.exports = { nodeClass: LocalAIEmbedding_Embeddings }
