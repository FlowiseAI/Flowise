import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { HuggingFaceInferenceEmbeddings, HuggingFaceInferenceEmbeddingsParams } from 'langchain/embeddings/hf'

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
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const apiKey = nodeData.inputs?.apiKey as string
        const modelName = nodeData.inputs?.modelName as string

        const obj: Partial<HuggingFaceInferenceEmbeddingsParams> = {
            apiKey
        }

        if (modelName) obj.model = modelName

        const model = new HuggingFaceInferenceEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: HuggingFaceInferenceEmbedding_Embeddings }
