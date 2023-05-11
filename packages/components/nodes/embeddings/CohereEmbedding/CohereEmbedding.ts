import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { CohereEmbeddings, CohereEmbeddingsParams } from 'langchain/embeddings/cohere'

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
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'embed-english-v2.0',
                        name: 'embed-english-v2.0'
                    },
                    {
                        label: 'embed-english-light-v2.0',
                        name: 'embed-english-light-v2.0'
                    },
                    {
                        label: 'embed-multilingual-v2.0',
                        name: 'embed-multilingual-v2.0'
                    }
                ],
                default: 'embed-english-v2.0',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const apiKey = nodeData.inputs?.cohereApiKey as string
        const modelName = nodeData.inputs?.modelName as string

        const obj: Partial<CohereEmbeddingsParams> & { apiKey?: string } = {
            apiKey
        }

        if (modelName) obj.modelName = modelName

        const model = new CohereEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: CohereEmbedding_Embeddings }
