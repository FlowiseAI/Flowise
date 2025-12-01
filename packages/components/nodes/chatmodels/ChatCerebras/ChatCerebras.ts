import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

/**
 * Available Cerebras models with their descriptions.
 * Update this list when new models become available.
 */
const CEREBRAS_MODELS = [
    {
        label: 'llama-3.3-70b',
        name: 'llama-3.3-70b',
        description: 'Best for complex reasoning and long-form content'
    },
    {
        label: 'qwen-3-32b',
        name: 'qwen-3-32b',
        description: 'Balanced performance for general-purpose tasks'
    },
    {
        label: 'llama3.1-8b',
        name: 'llama3.1-8b',
        description: 'Fastest model, ideal for simple tasks and high throughput'
    },
    {
        label: 'gpt-oss-120b',
        name: 'gpt-oss-120b',
        description: 'Largest model for demanding tasks'
    },
    {
        label: 'zai-glm-4.6',
        name: 'zai-glm-4.6',
        description: 'Advanced reasoning and complex problem-solving'
    }
] as const

class ChatCerebras_ChatModels implements INode {
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
        this.label = 'ChatCerebras'
        this.name = 'chatCerebras'
        this.version = 3.0
        this.type = 'ChatCerebras'
        this.icon = 'cerebras.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Cerebras Inference API'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cerebrasAIApi'],
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
                options: [...CEREBRAS_MODELS],
                default: 'llama3.1-8b'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
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
                label: 'BasePath',
                name: 'basepath',
                type: 'string',
                optional: true,
                default: 'https://api.cerebras.ai/v1',
                additionalParams: true
            },
            {
                label: 'BaseOptions',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                additionalParams: true
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
        const timeout = nodeData.inputs?.timeout as string
        const streaming = nodeData.inputs?.streaming as boolean
        const basePath = nodeData.inputs?.basepath as string
        const baseOptions = nodeData.inputs?.baseOptions
        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const cerebrasAIApiKey = getCredentialParam('cerebrasApiKey', credentialData, nodeData)

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            model: modelName,
            apiKey: cerebrasAIApiKey,
            openAIApiKey: cerebrasAIApiKey,
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
            } catch (exception) {
                throw new Error("Invalid JSON in the ChatCerebras's BaseOptions: " + exception)
            }
        }

        // Add integration tracking header and configure endpoint
        const integrationHeader = {
            'X-Cerebras-3rd-Party-Integration': 'flowise'
        }

        obj.configuration = {
            baseURL: basePath || 'https://api.cerebras.ai/v1',
            defaultHeaders: {
                ...integrationHeader,
                ...(parsedBaseOptions || {})
            }
        }

        const model = new ChatOpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: ChatCerebras_ChatModels }
