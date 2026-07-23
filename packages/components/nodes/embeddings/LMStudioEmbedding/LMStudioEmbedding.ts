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
        this.label = 'LM Studio Embedding'
        this.name = 'lmStudioEmbeddings'
        this.version = 1
        this.type = 'LM Studio Embeddings'
        this.icon = 'lmstudio.png'
        this.category = 'Embeddings'
        this.description = 'Use LM Studio local embeddings models'
        this.baseClasses = [this.type, 'Embeddings']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['lmstudioApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Base Path',
                name: 'basePath',
                type: 'string',
                default: 'http://localhost:1234/v1'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: 'nomic-embed-text-v1.5'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        if (!modelName) throw new Error('Model Name is required for LM Studio Embeddings')
        const basePath = nodeData.inputs?.basePath as string
        if (!basePath) throw new Error('Base Path is required for LM Studio Embeddings')

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const lmstudioApiKey = getCredentialParam('lmstudioApiKey', credentialData, nodeData)

        const obj: OpenAIEmbeddingsParams = {
            modelName,
            apiKey: lmstudioApiKey,
            configuration: { baseURL: basePath }
        }

        const model = new OpenAIEmbeddings(obj)

        return model
    }
}

module.exports = { nodeClass: LMStudioEmbedding_Embeddings }
