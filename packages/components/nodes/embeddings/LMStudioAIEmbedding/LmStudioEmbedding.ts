import {
    ClientOptions,
    OpenAIEmbeddings as LmStudioEmbeddings,
    OpenAIEmbeddingsParams as LmStudioEmbeddingsParams
} from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

class LmStudioEmbedding_Embeddings implements INode {
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
        this.label = 'LMStudio Embeddings'
        this.name = 'lmStudioEmbeddings'
        this.version = 1.0
        this.type = 'LmStudio Embeddings'
        this.icon = 'lmstudio.png'
        this.category = 'Embeddings'
        this.description = 'Use local embeddings from LMStudio'
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
                placeholder: 'http://localhost:1234/v1'
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
        const baseURL = nodeData.inputs?.baseURL as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const lmStudioApiKey = getCredentialParam('lmStudioApiKey', credentialData, nodeData)

        const obj: Partial<LmStudioEmbeddingsParams> & { configuration?: ClientOptions } = {
            modelName,
            configuration: {
                apiKey: lmStudioApiKey,
                baseURL
            }
        }

        const model = new LmStudioEmbeddings(obj)

        return model
    }
}

module.exports = { nodeClass: LmStudioEmbedding_Embeddings }
