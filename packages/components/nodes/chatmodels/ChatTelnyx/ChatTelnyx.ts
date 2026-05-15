import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const TELNYX_OPENAI_BASE = 'https://api.telnyx.com/v2/ai/openai'
const TELNYX_CHAT_MODELS_URL = 'https://api.telnyx.com/v2/ai/openai/models'

const fetchTelnyxModels = async (apiKey: string) => {
    const response = await fetch(TELNYX_CHAT_MODELS_URL, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        throw new Error(`Failed to fetch Telnyx models: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    return json.data || []
}

class ChatTelnyx_ChatModels implements INode {
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
        this.label = 'Telnyx Chat'
        this.name = 'chatTelnyx'
        this.version = 1.1
        this.type = 'ChatTelnyx'
        this.icon = 'telnyx.png'
        this.category = 'Chat Models'
        this.description = 'Use Telnyx OpenAI-compatible chat completions as a native Flowise chat model'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['telnyxApi'],
            refresh: true
        }
        this.inputs = [
            { label: 'Cache', name: 'cache', type: 'BaseCache', optional: true },
            { label: 'Model Name', name: 'modelName', type: 'asyncOptions', loadMethod: 'listModels', default: 'openai/gpt-4o', refresh: true },
            { label: 'Temperature', name: 'temperature', type: 'number', step: 0.1, default: 0.9, optional: true },
            { label: 'Streaming', name: 'streaming', type: 'boolean', default: true, optional: true, additionalParams: true },
            { label: 'Max Tokens', name: 'maxTokens', type: 'number', step: 1, optional: true, additionalParams: true },
            { label: 'Top Probability', name: 'topP', type: 'number', step: 0.1, optional: true, additionalParams: true },
            { label: 'Frequency Penalty', name: 'frequencyPenalty', type: 'number', step: 0.1, optional: true, additionalParams: true },
            { label: 'Presence Penalty', name: 'presencePenalty', type: 'number', step: 0.1, optional: true, additionalParams: true },
            { label: 'Timeout', name: 'timeout', type: 'number', step: 1, optional: true, additionalParams: true }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const credentialId = nodeData.credential || nodeData.inputs?.credentialId
            if (!credentialId) {
                return [{ label: 'Select a Telnyx API credential to load models', name: 'openai/gpt-4o' }]
            }

            try {
                const credentialData = await getCredentialData(credentialId as string, options)
                const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
                const models = await fetchTelnyxModels(apiKey)

                return models
                    .map((model: any) => ({
                        label: model.id,
                        name: model.id,
                        description: [model.task, model.context_length ? `context ${model.context_length}` : '', model.tier || '']
                            .filter(Boolean)
                            .join(' • ')
                    }))
            } catch (error) {
                console.warn('Falling back to static Telnyx chat model list:', error)
                return [{ label: 'openai/gpt-4o', name: 'openai/gpt-4o' }]
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
        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            modelName,
            openAIApiKey: apiKey,
            apiKey,
            streaming: streaming ?? true,
            configuration: {
                baseURL: TELNYX_OPENAI_BASE
            }
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache

        return new ChatOpenAI(obj)
    }
}

module.exports = { nodeClass: ChatTelnyx_ChatModels }
