import { BaseCache } from '@langchain/core/caches'
import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatDaoXE_ChatModels implements INode {
    readonly baseURL: string = 'https://daoxe.com/v1'
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
        this.label = 'DaoXE'
        this.name = 'chatDaoXE'
        this.version = 1.0
        this.type = 'ChatDaoXE'
        this.icon = 'daoxe.svg'
        this.category = 'Chat Models'
        this.description =
            'Multi-model multi-protocol gateway via OpenAI-compatible Chat Completions (https://daoxe.com/v1). Use an exact account model ID from GET /v1/models.'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['daoxeApi']
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
                placeholder: 'YOUR_DAOXE_MODEL_ID',
                description:
                    'Exact model ID from your DaoXE account catalog (GET /v1/models). Do not hardcode a public model price list. Not available in mainland China.'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true
            },
            {
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Presence Penalty',
                name: 'presencePenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Base Options',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                additionalParams: true,
                description: 'Additional options to pass to the DaoXE client. This should be a JSON object.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const streaming = nodeData.inputs?.streaming as boolean
        const baseOptions = nodeData.inputs?.baseOptions

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('daoxeApiKey', credentialData, nodeData)

        if (!openAIApiKey || openAIApiKey.trim() === '') {
            throw new Error(
                'DaoXE API Key is missing or empty. Please provide a valid DaoXE API key from https://daoxe.com/dashboard.'
            )
        }

        if (!modelName || modelName.trim() === '') {
            throw new Error(
                'Model Name is required. Set an exact model ID from your DaoXE account catalog (GET /v1/models).'
            )
        }

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ChatOpenAIFields = {
            modelName,
            openAIApiKey,
            apiKey: openAIApiKey,
            streaming: streaming ?? true
        }

        if (temperature != null && temperature !== '') {
            obj.temperature = parseFloat(temperature)
        }
        if (maxTokens) obj.maxCompletionTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (cache) obj.cache = cache

        let parsedBaseOptions: any | undefined = undefined

        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
                if (parsedBaseOptions.baseURL) {
                    console.warn("The 'baseURL' parameter is not allowed when using the ChatDaoXE node.")
                    parsedBaseOptions.baseURL = undefined
                }
            } catch (exception) {
                throw new Error('Invalid JSON in the BaseOptions: ' + exception)
            }
        }

        const model = new ChatOpenAI({
            ...obj,
            configuration: {
                baseURL: this.baseURL,
                ...parsedBaseOptions
            }
        })
        return model
    }
}

module.exports = { nodeClass: ChatDaoXE_ChatModels }
