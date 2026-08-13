import { BaseCache } from '@langchain/core/caches'
import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { GREENPT_API_BASE_URL, listGreenPTModels } from '../../../src/greenpt'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatGreenPT_ChatModels implements INode {
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
        this.label = 'GreenPT'
        this.name = 'chatGreenPT'
        this.version = 1.0
        this.type = 'ChatGreenPT'
        this.icon = 'greenpt.svg'
        this.category = 'Chat Models'
        this.description =
            'GreenPT is a European AI provider with an OpenAI-compatible API, optimized infrastructure, and data centers powered by 100% renewable energy.'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['greenPTApi']
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
                default: 'glm-5.2',
                description: 'Models are loaded from GreenPT. glm-5.2 is the flagship model; kimi-k2.7-code is optimized for coding.'
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
            }
        ]
    }

    loadMethods = {
        async listModels(nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> {
            return listGreenPTModels(nodeData, options, 'chat')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('greenPTApiKey', credentialData, nodeData)
        const obj: ChatOpenAIFields = {
            model: nodeData.inputs?.modelName as string,
            apiKey,
            openAIApiKey: apiKey,
            temperature: parseFloat(nodeData.inputs?.temperature as string),
            streaming: (nodeData.inputs?.streaming as boolean) ?? true,
            configuration: { baseURL: GREENPT_API_BASE_URL }
        }

        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const cache = nodeData.inputs?.cache as BaseCache
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache

        return new ChatOpenAI(obj)
    }
}

module.exports = { nodeClass: ChatGreenPT_ChatModels }
