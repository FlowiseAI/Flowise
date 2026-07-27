import { ClientOptions, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { GREENPT_API_BASE_URL, listGreenPTModels } from '../../../src/greenpt'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class GreenPTEmbedding_Embeddings implements INode {
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
        this.label = 'GreenPT Embedding'
        this.name = 'greenPTEmbedding'
        this.version = 1.0
        this.type = 'GreenPTEmbedding'
        this.icon = 'greenpt.svg'
        this.category = 'Embeddings'
        this.description = 'GreenPT embeddings run on optimized European infrastructure in data centers powered by 100% renewable energy.'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['greenPTApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'green-embedding'
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
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    loadMethods = {
        async listModels(nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> {
            return listGreenPTModels(nodeData, options, 'embedding')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('greenPTApiKey', credentialData, nodeData)
        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string; configuration?: ClientOptions } = {
            model: nodeData.inputs?.modelName as string,
            modelName: nodeData.inputs?.modelName as string,
            openAIApiKey: apiKey,
            configuration: { baseURL: GREENPT_API_BASE_URL }
        }

        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string
        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)

        return new OpenAIEmbeddings(obj)
    }
}

module.exports = { nodeClass: GreenPTEmbedding_Embeddings }
