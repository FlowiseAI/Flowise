import { BaseCache } from '@langchain/core/caches'
import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatAIBadgr_ChatModels implements INode {
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
        this.label = 'ChatAIBadgr'
        this.name = 'chatAIBadgr'
        this.version = 1.0
        this.type = 'ChatAIBadgr'
        this.icon = 'aibadgr.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around AI Badgr large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['aiBadgrApi']
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
                default: 'gpt-4o',
                description: 'Refer to <a target="_blank" href="https://aibadgr.com/api/v1/models">models</a> page'
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
                description: 'Additional options to pass to the AI Badgr client. This should be a JSON object.'
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
        const openAIApiKey = getCredentialParam('aiBadgrApiKey', credentialData, nodeData)

        // Custom error handling for missing API key
        if (!openAIApiKey || openAIApiKey.trim() === '') {
            throw new Error(
                'AI Badgr API Key is missing or empty. Please provide a valid AI Badgr API key in the credential configuration.'
            )
        }

        // Custom error handling for missing model name
        if (!modelName || modelName.trim() === '') {
            throw new Error('Model Name is required. Please enter a valid model name (e.g., gpt-4o).')
        }

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ChatOpenAIFields = {
            modelName,
            openAIApiKey,
            apiKey: openAIApiKey,
            streaming: streaming ?? true
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (cache) obj.cache = cache

        let parsedBaseOptions: any | undefined = undefined

        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
                if (parsedBaseOptions.baseURL) {
                    console.warn("The 'baseURL' parameter is not allowed when using the ChatAIBadgr node.")
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

module.exports = { nodeClass: ChatAIBadgr_ChatModels }
