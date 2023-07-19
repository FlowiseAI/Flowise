import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { HuggingFaceInferenceEmbeddings, HuggingFaceInferenceEmbeddingsParams } from './core'

class HuggingFaceInferenceEmbedding_Embeddings implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'HuggingFace Inference Embeddings'
        this.name = 'huggingFaceInferenceEmbeddings'
        this.type = 'HuggingFaceInferenceEmbeddings'
        this.icon = 'huggingface.png'
        this.category = 'Embeddings'
        this.description = 'HuggingFace Inference API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(HuggingFaceInferenceEmbeddings)]
        this.inputs = [
            {
                label: 'HuggingFace Api Key',
                name: 'apiKey',
                type: 'password'
            },
            {
                label: 'Model',
                name: 'modelName',
                type: 'string',
                optional: true
            },
            {
                label: 'Endpoint',
                name: 'endpoint',
                type: 'string',
                placeholder: 'https://xyz.eu-west-1.aws.endpoints.huggingface.cloud/sentence-transformers/all-MiniLM-L6-v2',
                description: 'Using your own inference endpoint',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const apiKey = nodeData.inputs?.apiKey as string
        const modelName = nodeData.inputs?.modelName as string
        const endpoint = nodeData.inputs?.endpoint as string

        const obj: Partial<HuggingFaceInferenceEmbeddingsParams> = {
            apiKey
        }

        if (modelName) obj.model = modelName
        if (endpoint) obj.endpoint = endpoint

        const model = new HuggingFaceInferenceEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: HuggingFaceInferenceEmbedding_Embeddings }
