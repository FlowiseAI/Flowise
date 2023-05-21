import { INode } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import '@tensorflow/tfjs-node'
import { TensorFlowEmbeddings, TensorFlowEmbeddingsParams } from 'langchain/embeddings/tensorflow'

class TensorFlowEmbedding_Embeddings implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]

    constructor() {
        this.label = 'TensorFlow Embeddings'
        this.name = 'tensorFlowEmbeddings'
        this.type = 'TensorFlowEmbeddings'
        this.icon = 'TensorFlow.svg'
        this.category = 'Embeddings'
        this.description = 'TensorFlow.js to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(TensorFlowEmbeddings)]
    }

    async init(): Promise<any> {
        const obj: Partial<TensorFlowEmbeddingsParams> = {}

        const model = new TensorFlowEmbeddings(obj)

        return model
    }
}

module.exports = { nodeClass: TensorFlowEmbedding_Embeddings }
