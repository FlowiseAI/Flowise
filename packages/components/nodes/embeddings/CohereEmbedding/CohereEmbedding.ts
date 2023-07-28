import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { CohereEmbeddings, CohereEmbeddingsParams } from 'langchain/embeddings/cohere'

class CohereEmbedding_Embeddings implements INode {
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
        this.label = 'Cohere Embeddings'
        this.name = 'cohereEmbeddings'
        this.version = 1.0
        this.type = 'CohereEmbeddings'
        this.icon = 'cohere.png'
        this.category = 'Embeddings'
        this.description = 'Cohere API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(CohereEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cohereApi']
        }
        this.inputs = [
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const cohereApiKey = getCredentialParam('cohereApiKey', credentialData, nodeData)

        const obj: Partial<CohereEmbeddingsParams> & { apiKey?: string } = {
            apiKey: cohereApiKey
        }

        if (modelName) obj.modelName = modelName

        const model = new CohereEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: CohereEmbedding_Embeddings }
