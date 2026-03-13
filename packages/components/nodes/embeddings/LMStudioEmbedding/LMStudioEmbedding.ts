import { ClientOptions, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

class LMStudioEmbedding_Embeddings implements INode {
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
        this.label = 'LM Studio Embeddings'
        this.name = 'lmStudioEmbeddings'
        this.version = 1.0
        this.type = 'LMStudio Embeddings'
        this.icon = 'lmstudio.png'
        this.category = 'Embeddings'
        this.description = 'Use LM Studio local embeddings models with OpenAI-compatible API'
        this.baseClasses = [this.type, 'Embeddings']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['lmStudioApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                placeholder: 'http://localhost:1234/v1',
                default: 'http://localhost:1234/v1'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: 'text-embedding-ada-002',
                description: 'Name of the embedding model loaded in LM Studio'
            },
            {
                label: 'Strip New Lines',
                name: 'stripNewLines',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                optional: true,
                additionalParams: true,
                description: 'Number of texts to process in each batch'
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true,
                description: 'Timeout in milliseconds for API requests'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const baseURL = nodeData.inputs?.baseURL as string
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const lmStudioApiKey = getCredentialParam('lmStudioApiKey', credentialData, nodeData)

        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string; configuration?: ClientOptions } = {
            modelName,
            // LM Studio doesn't require API key, but OpenAI SDK expects one
            openAIApiKey: lmStudioApiKey || 'lm-studio-local'
        }

        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)

        if (baseURL) {
            obj.configuration = { 
                baseURL: baseURL,
                // LM Studio doesn't require authentication
                defaultHeaders: {}
            }
        }

        const model = new OpenAIEmbeddings(obj)

        return model
    }
}

module.exports = { nodeClass: LMStudioEmbedding_Embeddings }