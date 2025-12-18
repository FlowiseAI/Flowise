import { ClientOptions, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class AIBadgrEmbedding_Embeddings implements INode {
    readonly baseURL: string = 'https://aibadgr.com/api/v1'
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
        this.label = 'AIBadgrEmbedding'
        this.name = 'aiBadgrEmbedding'
        this.version = 3.0
        this.type = 'AIBadgrEmbedding'
        this.icon = 'aibadgr.svg'
        this.category = 'Embeddings'
        this.description = 'AI Badgr API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['aiBadgrApi']
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
                label: 'BaseOptions',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                additionalParams: true,
                description: 'Additional options to pass to the AI Badgr client. This should be a JSON object.'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                optional: true
            },
            {
                label: 'Dimensions',
                name: 'dimensions',
                type: 'number',
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
        const baseOptions = nodeData.inputs?.baseOptions

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('aiBadgrApiKey', credentialData, nodeData)

        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string; configuration?: ClientOptions } = {
            openAIApiKey
        }

        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (modelName) obj.modelName = modelName
        if (dimensions) obj.dimensions = parseInt(dimensions, 10)

        let parsedBaseOptions: any | undefined = undefined
        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
                if (parsedBaseOptions.baseURL) {
                    console.warn("The 'baseURL' parameter is not allowed when using the AIBadgrEmbedding node.")
                    parsedBaseOptions.baseURL = undefined
                }
            } catch (exception) {
                throw new Error("Invalid JSON in the AIBadgrEmbedding's BaseOptions: " + exception)
            }
        }

        obj.configuration = {
            baseURL: this.baseURL,
            ...(parsedBaseOptions ?? {})
        }

        const model = new OpenAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: AIBadgrEmbedding_Embeddings }
