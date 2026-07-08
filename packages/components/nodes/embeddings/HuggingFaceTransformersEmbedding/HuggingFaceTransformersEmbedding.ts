import {
    HuggingFaceTransformersEmbeddings,
    HuggingFaceTransformersEmbeddingsParams
} from '@langchain/community/embeddings/huggingface_transformers'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class HuggingFaceTransformersEmbedding_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'HuggingFace Transformers Embedding'
        this.name = 'huggingFaceTransformersEmbedding'
        this.version = 1.0
        this.type = 'HuggingFaceTransformersEmbeddings'
        this.icon = 'HuggingFace.svg'
        this.category = 'Embeddings'
        this.description = 'Generate embeddings locally for a given text using HuggingFace models, without any API key'
        this.baseClasses = [this.type, ...getBaseClasses(HuggingFaceTransformersEmbeddings)]
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                description: 'A feature extraction model from HuggingFace. The model is downloaded and run locally.',
                placeholder: 'Xenova/all-MiniLM-L6-v2',
                default: 'Xenova/all-MiniLM-L6-v2'
            },
            {
                label: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                step: 1,
                default: 512,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Strip New Lines',
                name: 'stripNewLines',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const batchSize = nodeData.inputs?.batchSize as string
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean

        const obj: Partial<HuggingFaceTransformersEmbeddingsParams> = {
            model: modelName
        }

        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (stripNewLines !== undefined) obj.stripNewLines = stripNewLines

        const model = new HuggingFaceTransformersEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: HuggingFaceTransformersEmbedding_Embeddings }
