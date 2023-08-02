import { GoogleVertexAIEmbeddings, GoogleVertexAIEmbeddingsParams } from 'langchain/embeddings/googlevertexai'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class GoogleVertexAIEmbedding_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'GoogleVertexAI Embeddings'
        this.name = 'googlevertexaiEmbeddings'
        this.version = 1.0
        this.type = 'GoogleVertexAIEmbeddings'
        this.icon = 'vertexai.svg'
        this.category = 'Embeddings'
        this.description = 'Google vertexAI API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(GoogleVertexAIEmbeddings)]
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'textembedding-gecko',
                        name: 'textembedding-gecko'
                    },
                    {
                        label: 'textembedding-gecko@001',
                        name: 'textembedding-gecko@001'
                    }
                ],
                default: 'textembedding-gecko'
            }
        ]
    }

    async init(nodeData: INodeData, _: string): Promise<any> {
        const model = nodeData.inputs?.modelName as string
        const obj: GoogleVertexAIEmbeddingsParams = {
            model
        }

        const embedding = new GoogleVertexAIEmbeddings(obj)
        return embedding
    }
}

module.exports = { nodeClass: GoogleVertexAIEmbedding_Embeddings }
