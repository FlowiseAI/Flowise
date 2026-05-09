import { BaseCache } from '@langchain/core/caches'
import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatAstraflow_ChatModels implements INode {
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
        this.label = 'ChatAstraflow'
        this.name = 'chatAstraflow'
        this.version = 1.0
        this.type = 'ChatAstraflow'
        this.icon = 'astraflow.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Astraflow (UCloud) large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['astraflowApi']
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Base URL',
                name: 'basePath',
                type: 'string',
                default: 'https://api-us-ca.umodelverse.ai/v1',
                description:
                    'Astraflow API base URL. Use https://api-us-ca.umodelverse.ai/v1 for the Global endpoint or https://api.modelverse.cn/v1 for the China endpoint.'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: 'gpt-4o-mini',
                description: 'Enter the model name supported by Astraflow (e.g., gpt-4o-mini, claude-3-5-sonnet, deepseek-chat)'
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
                description: 'Additional options to pass to the Astraflow client. This should be a JSON object.'
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
        const basePath = (nodeData.inputs?.basePath as string) || 'https://api-us-ca.umodelverse.ai/v1'

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const astraflowApiKey = getCredentialParam('astraflowApiKey', credentialData, nodeData)

        if (!astraflowApiKey || astraflowApiKey.trim() === '') {
            throw new Error(
                'Astraflow API Key is missing or empty. Please provide a valid Astraflow API key in the credential configuration.'
            )
        }

        if (!modelName || modelName.trim() === '') {
            throw new Error('Model Name is required. Please enter a valid Astraflow model name (e.g., gpt-4o-mini).')
        }

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            modelName,
            openAIApiKey: astraflowApiKey,
            apiKey: astraflowApiKey,
            streaming: streaming ?? true
        }

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
                    console.warn("The 'baseURL' parameter is not allowed in baseOptions when using the ChatAstraflow node. Use the Base URL field instead.")
                    parsedBaseOptions.baseURL = undefined
                }
            } catch (exception) {
                throw new Error('Invalid JSON in the BaseOptions: ' + exception)
            }
        }

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

module.exports = { nodeClass: ChatAstraflow_ChatModels }
