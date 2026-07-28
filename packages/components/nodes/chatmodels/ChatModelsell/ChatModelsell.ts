import axios from 'axios'
import { BaseCache } from '@langchain/core/caches'
import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const MODELSELL_BASE_URL = 'https://modelsell.com/v1'

type ModelsellModelsResponse = {
    data?: Array<{ id?: unknown }>
}

class ChatModelsell_ChatModels implements INode {
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
        this.label = 'Modelsell'
        this.name = 'chatModelsell'
        this.version = 1.0
        this.type = 'ChatModelsell'
        this.icon = 'modelsell.png'
        this.category = 'Chat Models'
        this.description = 'Connect to Modelsell models through the OpenAI-compatible Chat Completions API'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['modelsellApi']
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
                freeSolo: true
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
                label: 'Default Headers',
                name: 'defaultHeaders',
                type: 'json',
                optional: true,
                additionalParams: true,
                description: 'Additional headers to include with every request'
            }
        ]
    }

    loadMethods = {
        async listModels(nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> {
            if (nodeData.inputs?.credentialId) {
                nodeData.credential = nodeData.inputs.credentialId as string
            }
            const credentialData = await getCredentialData(nodeData.credential ?? '', options ?? {})
            const apiKey = getCredentialParam('modelsellApiKey', credentialData, nodeData)

            if (!apiKey) {
                throw new Error('Modelsell API Key missing from credential')
            }

            const response = await axios.get<ModelsellModelsResponse>(`${MODELSELL_BASE_URL}/models`, {
                headers: { Authorization: `Bearer ${apiKey}` }
            })

            return (response.data.data ?? []).flatMap((model) =>
                typeof model.id === 'string' && model.id.length > 0 ? [{ label: model.id, name: model.id }] : []
            )
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const temperature = nodeData.inputs?.temperature as string
        const streaming = nodeData.inputs?.streaming as boolean
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const defaultHeaders = nodeData.inputs?.defaultHeaders
        const cache = nodeData.inputs?.cache as BaseCache

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs.credentialId as string
        }
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('modelsellApiKey', credentialData, nodeData)

        if (!apiKey) {
            throw new Error('Modelsell API Key missing from credential')
        }
        if (!modelName) {
            throw new Error('Modelsell Model Name is required')
        }

        const obj: ChatOpenAIFields = {
            model: modelName,
            apiKey,
            openAIApiKey: apiKey,
            streaming: streaming ?? true,
            configuration: {
                baseURL: MODELSELL_BASE_URL
            }
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache

        if (defaultHeaders) {
            try {
                obj.configuration = {
                    baseURL: MODELSELL_BASE_URL,
                    defaultHeaders: typeof defaultHeaders === 'object' ? defaultHeaders : JSON.parse(defaultHeaders)
                }
            } catch (exception) {
                throw new Error('Invalid JSON in Default Headers: ' + exception)
            }
        }

        return new ChatOpenAI(obj)
    }
}

module.exports = { nodeClass: ChatModelsell_ChatModels }
