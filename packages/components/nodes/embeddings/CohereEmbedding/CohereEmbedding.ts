import { CohereEmbeddings, CohereEmbeddingsParams } from '@langchain/cohere'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

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
        this.version = 2.0
        this.type = 'CohereEmbeddings'
        this.icon = 'Cohere.svg'
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
                        label: 'embed-english-v3.0',
                        name: 'embed-english-v3.0',
                        description: 'Embedding Dimensions: 1024'
                    },
                    {
                        label: 'embed-english-light-v3.0',
                        name: 'embed-english-light-v3.0',
                        description: 'Embedding Dimensions: 384'
                    },
                    {
                        label: 'embed-multilingual-v3.0',
                        name: 'embed-multilingual-v3.0',
                        description: 'Embedding Dimensions: 1024'
                    },
                    {
                        label: 'embed-multilingual-light-v3.0',
                        name: 'embed-multilingual-light-v3.0',
                        description: 'Embedding Dimensions: 384'
                    },
                    {
                        label: 'embed-english-v2.0',
                        name: 'embed-english-v2.0',
                        description: 'Embedding Dimensions: 4096'
                    },
                    {
                        label: 'embed-english-light-v2.0',
                        name: 'embed-english-light-v2.0',
                        description: 'Embedding Dimensions: 1024'
                    },
                    {
                        label: 'embed-multilingual-v2.0',
                        name: 'embed-multilingual-v2.0',
                        description: 'Embedding Dimensions: 768'
                    }
                ],
                default: 'embed-english-v2.0',
                optional: true
            },
            {
                label: 'Type',
                name: 'inputType',
                type: 'options',
                description:
                    'Specifies the type of input passed to the model. Required for embedding models v3 and higher. <a target="_blank" href="https://docs.cohere.com/reference/embed">Official Docs</a>',
                options: [
                    {
                        label: 'search_document',
                        name: 'search_document',
                        description: 'Use this to encode documents for embeddings that you store in a vector database for search use-cases'
                    },
                    {
                        label: 'search_query',
                        name: 'search_query',
                        description: 'Use this when you query your vector DB to find relevant documents.'
                    },
                    {
                        label: 'classification',
                        name: 'classification',
                        description: 'Use this when you use the embeddings as an input to a text classifier'
                    },
                    {
                        label: 'clustering',
                        name: 'clustering',
                        description: 'Use this when you want to cluster the embeddings.'
                    }
                ],
                default: 'search_query',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const inputType = nodeData.inputs?.inputType as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const cohereApiKey = getCredentialParam('cohereApiKey', credentialData, nodeData)

        const obj: Partial<CohereEmbeddingsParams> & { apiKey?: string } = {
            apiKey: cohereApiKey
        }

        if (modelName) obj.model = modelName
        if (inputType) obj.inputType = inputType

        const model = new CohereEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: CohereEmbedding_Embeddings }
