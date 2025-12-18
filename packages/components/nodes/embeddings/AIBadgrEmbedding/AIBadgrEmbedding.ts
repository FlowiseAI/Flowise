import { OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class AIBadgrEmbedding_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'AIBadgrEmbedding'
        this.name = 'aiBadgrEmbedding'
        this.version = 1.0
        this.type = 'AIBadgrEmbedding'
        this.icon = 'aibadgr.svg'
        this.category = 'Embeddings'
        this.description = 'AI Badgr Embedding models to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['aiBadgrApi']
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: 'text-embedding-3-small',
                description: 'Refer to <a target="_blank" href="https://aibadgr.com/api/v1/models">embedding models</a> page'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const aiBadgrApiKey = getCredentialParam('aiBadgrApiKey', credentialData, nodeData)

        const obj: Partial<OpenAIEmbeddingsParams> = {
            modelName: modelName,
            openAIApiKey: aiBadgrApiKey,
            configuration: {
                baseURL: 'https://aibadgr.com/api/v1'
            }
        }

        const model = new OpenAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: AIBadgrEmbedding_Embeddings }
