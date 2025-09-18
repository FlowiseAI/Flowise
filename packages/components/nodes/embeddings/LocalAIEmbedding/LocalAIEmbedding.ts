import { ClientOptions, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

class LocalAIEmbedding_Embeddings implements INode {
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
        this.label = 'LocalAI Embeddings'
        this.name = 'localAIEmbeddings'
        this.version = 1.0
        this.type = 'LocalAI Embeddings'
        this.icon = 'localai.png'
        this.category = 'Embeddings'
        this.description = 'Use local embeddings models like llama.cpp'
        this.baseClasses = [this.type, 'Embeddings']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['localAIApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Base Path',
                name: 'basePath',
                type: 'string',
                placeholder: 'http://localhost:8080/v1'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: 'text-embedding-ada-002'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const basePath = nodeData.inputs?.basePath as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const localAIApiKey = getCredentialParam('localAIApiKey', credentialData, nodeData)

        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string; configuration?: ClientOptions } = {
            modelName,
            openAIApiKey: 'sk-'
        }

        if (localAIApiKey) obj.openAIApiKey = localAIApiKey

        if (basePath) obj.configuration = { baseURL: basePath }

        const model = new OpenAIEmbeddings(obj)

        return model
    }
}

module.exports = { nodeClass: LocalAIEmbedding_Embeddings }
