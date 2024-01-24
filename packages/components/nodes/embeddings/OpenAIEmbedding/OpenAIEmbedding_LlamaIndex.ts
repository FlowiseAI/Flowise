import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { OpenAIEmbedding } from 'llamaindex'

class OpenAIEmbedding_LlamaIndex_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    tags: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAI Embedding'
        this.name = 'openAIEmbedding_LlamaIndex'
        this.version = 1.0
        this.type = 'OpenAIEmbedding'
        this.icon = 'openai.svg'
        this.category = 'Embeddings'
        this.description = 'OpenAI Embedding specific for LlamaIndex'
        this.baseClasses = [this.type, 'BaseEmbedding_LlamaIndex', ...getBaseClasses(OpenAIEmbedding)]
        this.tags = ['LlamaIndex']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
        this.inputs = [
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'BasePath',
                name: 'basepath',
                type: 'string',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const timeout = nodeData.inputs?.timeout as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)

        const obj: Partial<OpenAIEmbedding> = {
            apiKey: openAIApiKey
        }
        if (timeout) obj.timeout = parseInt(timeout, 10)

        const model = new OpenAIEmbedding(obj)
        return model
    }
}

module.exports = { nodeClass: OpenAIEmbedding_LlamaIndex_Embeddings }
