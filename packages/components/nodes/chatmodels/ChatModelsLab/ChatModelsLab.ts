import { BaseCache } from '@langchain/core/caches'
import { ChatOpenAI } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const MODELSLAB_CHAT_BASE_URL = 'https://modelslab.com/uncensored-chat/v1'

const MODELSLAB_CHAT_MODELS = [
    { label: 'Llama 3.1 8B Uncensored (128K)', name: 'llama-3.1-8b-uncensored' },
    { label: 'Llama 3.1 70B Uncensored (128K)', name: 'llama-3.1-70b-uncensored' }
]

/**
 * ModelsLab chat model node for Flowise.
 *
 * Provides uncensored Llama 3.1 models via ModelsLab's OpenAI-compatible
 * API endpoint. Suitable for creative writing, research, and use cases
 * where standard content restrictions are too limiting.
 *
 * Docs: https://docs.modelslab.com/uncensored-chat
 */
class ChatModelsLab_ChatModels implements INode {
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
        this.label = 'ChatModelsLab'
        this.name = 'chatModelsLab'
        this.version = 1.0
        this.type = 'ChatModelsLab'
        this.icon = 'modelslab.png'
        this.category = 'Chat Models'
        this.description =
            'Uncensored Llama 3.1 models (8B & 70B) via ModelsLab API. ' +
            '128K context window, no content restrictions. ' +
            'Ideal for creative writing, research, and unrestricted use cases.'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['modelsLabApi']
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
                options: MODELSLAB_CHAT_MODELS,
                default: 'llama-3.1-8b-uncensored',
                description:
                    'Refer to <a target="_blank" href="https://docs.modelslab.com">ModelsLab docs</a> for model details'
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
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true,
                description: 'Maximum number of tokens to generate'
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true,
                description: 'Nucleus sampling probability (0–1)'
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
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const temperature = nodeData.inputs?.temperature as string
        const streaming = nodeData.inputs?.streaming as boolean
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const modelsLabApiKey = getCredentialParam('modelsLabApiKey', credentialData, nodeData)

        if (!modelsLabApiKey) {
            throw new Error('ModelsLab API key is required. Get yours at https://modelslab.com')
        }

        const obj: Record<string, any> = {
            model: modelName || 'llama-3.1-8b-uncensored',
            openAIApiKey: modelsLabApiKey,
            configuration: {
                baseURL: MODELSLAB_CHAT_BASE_URL
            },
            temperature: parseFloat(temperature) || 0.7,
            streaming: streaming ?? true
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (cache) obj.cache = cache

        return new ChatOpenAI(obj)
    }
}

module.exports = { nodeClass: ChatModelsLab_ChatModels }
