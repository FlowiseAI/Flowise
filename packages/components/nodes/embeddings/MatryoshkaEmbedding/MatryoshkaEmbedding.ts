import { Embeddings } from '@langchain/core/embeddings'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { MatryoshkaEmbeddings } from '../../../src/matryoshkaEmbeddings'

class MatryoshkaEmbedding_Embeddings implements INode {
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
        this.label = 'Matryoshka Embeddings'
        this.name = 'matryoshkaEmbeddings'
        this.version = 1.0
        this.type = 'MatryoshkaEmbeddings'
        this.icon = 'matryoshka.svg'
        this.category = 'Embeddings'
        this.description = 'Truncate embedding dimensions for Matryoshka embedding models to reduce storage while preserving quality'
        this.baseClasses = [this.type, ...getBaseClasses(MatryoshkaEmbeddings)]
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Dimensions',
                name: 'dimensions',
                type: 'number',
                description:
                    'The number of dimensions to truncate the embedding vectors to. Must be less than the original embedding dimensions. Lower values reduce storage but may decrease quality.',
                placeholder: '256'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, _options: ICommonObject): Promise<any> {
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const dimensionsStr = nodeData.inputs?.dimensions as string

        if (!embeddings) {
            throw new Error('Embeddings input is required')
        }

        if (!dimensionsStr) {
            throw new Error('Dimensions input is required')
        }

        const dimensions = parseInt(dimensionsStr, 10)
        if (isNaN(dimensions) || dimensions <= 0) {
            throw new Error('Dimensions must be a positive integer')
        }

        const matryoshkaEmbeddings = new MatryoshkaEmbeddings({
            embeddings,
            dimensions
        })

        return matryoshkaEmbeddings
    }
}

module.exports = { nodeClass: MatryoshkaEmbedding_Embeddings }
