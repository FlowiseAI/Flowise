import { BaseCache } from '@langchain/core/caches'
import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { checkDenyList } from '../../../src/httpSecurity'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const DEFAULT_ATLASCLOUD_BASE_URL = 'https://api.atlascloud.ai/v1'
const DEFAULT_ATLASCLOUD_MODEL = 'qwen/qwen3.5-flash'

class ChatAtlasCloud_ChatModels implements INode {
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
        this.label = 'Atlas Cloud'
        this.name = 'chatAtlasCloud'
        this.version = 1.0
        this.type = 'ChatAtlasCloud'
        this.icon = 'atlascloud.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Atlas Cloud OpenAI-compatible chat models'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['atlasCloudApi'],
            optional: true
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
                type: 'options',
                default: DEFAULT_ATLASCLOUD_MODEL,
                options: [
                    {
                        label: 'qwen/qwen3.5-flash',
                        name: 'qwen/qwen3.5-flash',
                        description: 'Default Atlas Cloud chat model'
                    },
                    {
                        label: 'deepseek-ai/deepseek-v4-pro',
                        name: 'deepseek-ai/deepseek-v4-pro',
                        description: 'Reasoning-capable Atlas Cloud chat model'
                    }
                ]
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
                default: DEFAULT_ATLASCLOUD_BASE_URL,
                optional: true,
                description: 'Override the Atlas Cloud OpenAI-compatible API base URL.',
                additionalParams: true
            },
            {
                label: 'Base Options',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                additionalParams: true,
                description: 'Default headers or other OpenAI client configuration options to include with every request.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = ((nodeData.inputs?.modelName as string) || DEFAULT_ATLASCLOUD_MODEL).trim()
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const streaming = nodeData.inputs?.streaming as boolean
        const basePath = (
            (nodeData.inputs?.basepath as string) ||
            process.env.ATLASCLOUD_API_BASE ||
            process.env.ATLAS_CLOUD_API_BASE ||
            DEFAULT_ATLASCLOUD_BASE_URL
        ).trim()
        const baseOptions = nodeData.inputs?.baseOptions
        const cache = nodeData.inputs?.cache as BaseCache

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const atlasCloudApiKey =
            getCredentialParam('atlasCloudApiKey', credentialData, nodeData) ||
            process.env.ATLASCLOUD_API_KEY ||
            process.env.ATLAS_CLOUD_API_KEY

        if (!atlasCloudApiKey || atlasCloudApiKey.trim() === '') {
            throw new Error('Atlas Cloud API Key is missing. Configure an Atlas Cloud credential or set ATLASCLOUD_API_KEY.')
        }

        if (!modelName) {
            throw new Error('Model Name is required. Select an Atlas Cloud model such as qwen/qwen3.5-flash.')
        }

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            modelName,
            openAIApiKey: atlasCloudApiKey,
            apiKey: atlasCloudApiKey,
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
                    console.warn("The 'baseURL' parameter is not allowed in Base Options when using the ChatAtlasCloud node.")
                    delete parsedBaseOptions.baseURL
                }
            } catch (exception) {
                throw new Error('Invalid JSON in the BaseOptions: ' + exception)
            }
        }

        await checkDenyList(basePath)

        const model = new ChatOpenAI({
            ...obj,
            configuration: {
                baseURL: basePath,
                ...parsedBaseOptions
            }
        })
        return model
    }
}

module.exports = { nodeClass: ChatAtlasCloud_ChatModels }
