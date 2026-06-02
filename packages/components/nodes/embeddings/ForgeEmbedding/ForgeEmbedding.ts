import { ClientOptions, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ForgeEmbedding_Embeddings implements INode {
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
        this.label = 'Forge Embedding'
        this.name = 'forgeEmbeddings'
        this.version = 1.0
        this.type = 'ForgeEmbeddings'
        this.icon = 'forge.svg'
        this.category = 'Embeddings'
        this.description = 'Voxell Forge OpenAI-compatible API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
        this.inputs = [
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
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                default: 'forge-pro',
                optional: true
            },
            {
                label: 'Dimensions',
                name: 'dimensions',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Encoding Format',
                name: 'encodingFormat',
                type: 'options',
                options: [
                    {
                        label: 'float',
                        name: 'float'
                    },
                    {
                        label: 'base64',
                        name: 'base64'
                    }
                ],
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string
        const modelName = nodeData.inputs?.modelName as string
        const dimensions = nodeData.inputs?.dimensions as string
        const encodingFormat = nodeData.inputs?.encodingFormat as 'float' | 'base64' | undefined

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)

        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string; configuration?: ClientOptions } = {
            openAIApiKey,
            configuration: {
                baseURL: 'https://api.voxell.ai/v1'
            }
        }

        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (modelName) obj.modelName = modelName
        if (dimensions) obj.dimensions = parseInt(dimensions, 10)
        if (encodingFormat) obj.encodingFormat = encodingFormat

        const model = new OpenAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: ForgeEmbedding_Embeddings }
