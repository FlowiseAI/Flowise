import axios from 'axios'
import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const DEFAULT_BASE_URL = 'https://api.empiriolabs.ai/v1'

// Fallback chat models used when the live catalog cannot be reached
const FALLBACK_MODELS: INodeOptionsValue[] = [
    { label: 'Qwen3.7 Plus', name: 'qwen3-7-plus' },
    { label: 'Qwen3.7 Max', name: 'qwen3-7-max' },
    { label: 'DeepSeek V4 Pro', name: 'deepseek-v4-pro' },
    { label: 'DeepSeek V4 Flash', name: 'deepseek-v4-flash' },
    { label: 'GLM-5.1', name: 'glm-5-1' },
    { label: 'Kimi K2.7 Code', name: 'kimi-k2-7-code' },
    { label: 'MiniMax M3', name: 'minimax-m3' }
]

class ChatEmpirioLabs_ChatModels implements INode {
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
        this.label = 'ChatEmpirioLabs'
        this.name = 'chatEmpirioLabs'
        this.version = 1.0
        this.type = 'ChatEmpirioLabs'
        this.icon = 'empiriolabs.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around EmpirioLabs AI chat models that use the OpenAI compatible Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['empirioLabsApi']
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
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'qwen3-7-plus'
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
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Base Path',
                name: 'basepath',
                type: 'string',
                optional: true,
                default: DEFAULT_BASE_URL,
                description: 'Override the default base URL for the API, e.g., "https://api.example.com/v1"',
                additionalParams: true
            },
            {
                label: 'Base Options',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                description: 'Default headers to include with every request to the API.',
                additionalParams: true
            }
        ]
    }

    loadMethods = {
        async listModels(_: INodeData, __?: ICommonObject): Promise<INodeOptionsValue[]> {
            try {
                const response = await axios.get(`${DEFAULT_BASE_URL}/models`)
                const models = response?.data?.data
                if (!Array.isArray(models) || models.length === 0) {
                    return FALLBACK_MODELS
                }
                const chatModels = models
                    .filter((model: ICommonObject) => {
                        const endpoints = model?.supported_endpoints
                        if (!Array.isArray(endpoints) || endpoints.length === 0) {
                            return true
                        }
                        return endpoints.some(
                            (endpoint: string) => typeof endpoint === 'string' && endpoint.includes('/v1/chat/completions')
                        )
                    })
                    .map((model: ICommonObject) => ({
                        label: (model?.display_name as string) || (model?.id as string),
                        name: model?.id as string,
                        description: model?.description as string
                    }))
                    .filter((option: INodeOptionsValue) => Boolean(option.name))
                return chatModels.length > 0 ? chatModels : FALLBACK_MODELS
            } catch (exception) {
                return FALLBACK_MODELS
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const streaming = nodeData.inputs?.streaming as boolean
        const basePath = (nodeData.inputs?.basepath as string) || DEFAULT_BASE_URL
        const baseOptions = nodeData.inputs?.baseOptions
        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const empirioLabsApiKey = getCredentialParam('empirioLabsApiKey', credentialData, nodeData)

        if (!empirioLabsApiKey || empirioLabsApiKey.trim() === '') {
            throw new Error(
                'EmpirioLabs API Key is missing or empty. Please provide a valid EmpirioLabs API key in the credential configuration.'
            )
        }

        if (!modelName || modelName.trim() === '') {
            throw new Error('Model Name is required. Please select or enter a valid model name (e.g., qwen3-7-plus).')
        }

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            model: modelName,
            apiKey: empirioLabsApiKey,
            openAIApiKey: empirioLabsApiKey,
            streaming: streaming ?? true
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache

        let parsedBaseOptions: any | undefined = undefined

        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
                if (parsedBaseOptions.baseURL) {
                    console.warn("The 'baseURL' parameter is not allowed in Base Options when using the ChatEmpirioLabs node.")
                    parsedBaseOptions.baseURL = undefined
                }
            } catch (exception) {
                throw new Error("Invalid JSON in the ChatEmpirioLabs's BaseOptions: " + exception)
            }
        }

        obj.configuration = {
            baseURL: basePath,
            defaultHeaders: parsedBaseOptions
        }

        const model = new ChatOpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: ChatEmpirioLabs_ChatModels }
