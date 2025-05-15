import { ChatPerplexity as LangchainChatPerplexity, PerplexityChatInput } from '@langchain/community/chat_models/perplexity'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatPerplexity } from './FlowiseChatPerplexity'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

class ChatPerplexity_ChatModels implements INode {
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
        this.label = 'ChatPerplexity'
        this.name = 'chatPerplexity'
        this.version = 0.1
        this.type = 'ChatPerplexity'
        this.icon = 'perplexity.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Perplexity large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainChatPerplexity)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['perplexityApi']
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
                name: 'model',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'sonar'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 1,
                optional: true
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
                label: 'Top P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                type: 'number',
                step: 1,
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
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
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
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            // {
            //     label: 'Search Domain Filter',
            //     name: 'searchDomainFilter',
            //     type: 'json',
            //     optional: true,
            //     additionalParams: true,
            //     description: 'Limit citations to URLs from specified domains (e.g., ["example.com", "anotherexample.org"])'
            // },
            // Currently disabled as output is stored as additional_kwargs
            // {
            //     label: 'Return Images',
            //     name: 'returnImages',
            //     type: 'boolean',
            //     optional: true,
            //     additionalParams: true,
            //     description: 'Whether the model should return images (if supported by the model)'
            // },
            // Currently disabled as output is stored as additional_kwargs
            // {
            //     label: 'Return Related Questions',
            //     name: 'returnRelatedQuestions',
            //     type: 'boolean',
            //     optional: true,
            //     additionalParams: true,
            //     description: 'Whether the online model should return related questions'
            // },
            // {
            //     label: 'Search Recency Filter',
            //     name: 'searchRecencyFilter',
            //     type: 'options',
            //     options: [
            //         { label: 'Not Set', name: '' },
            //         { label: 'Month', name: 'month' },
            //         { label: 'Week', name: 'week' },
            //         { label: 'Day', name: 'day' },
            //         { label: 'Hour', name: 'hour' }
            //     ],
            //     default: '',
            //     optional: true,
            //     additionalParams: true,
            //     description: 'Filter search results by time interval (does not apply to images)'
            // },
            {
                label: 'Proxy Url',
                name: 'proxyUrl',
                type: 'string',
                optional: true,
                additionalParams: true
            }
            // LangchainJS currently does not has a web_search_options, search_after_date_filter or search_before_date_filter parameter.
            // To add web_search_options (user_location, search_context_size) and search_after_date_filter, search_before_date_filter as a modelKwargs parameter.
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatPerplexity')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const model = nodeData.inputs?.model as string
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const streaming = nodeData.inputs?.streaming as boolean
        const timeout = nodeData.inputs?.timeout as string
        const searchDomainFilterRaw = nodeData.inputs?.searchDomainFilter
        const returnImages = nodeData.inputs?.returnImages as boolean
        const returnRelatedQuestions = nodeData.inputs?.returnRelatedQuestions as boolean
        const searchRecencyFilter = nodeData.inputs?.searchRecencyFilter as string
        const proxyUrl = nodeData.inputs?.proxyUrl as string
        const cache = nodeData.inputs?.cache as BaseCache

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('perplexityApiKey', credentialData, nodeData)

        if (!apiKey) {
            throw new Error('Perplexity API Key missing from credential')
        }

        const obj: PerplexityChatInput = {
            model,
            apiKey,
            streaming: streaming ?? true
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseInt(topK, 10)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (returnImages) obj.returnImages = returnImages
        if (returnRelatedQuestions) obj.returnRelatedQuestions = returnRelatedQuestions
        if (searchRecencyFilter && searchRecencyFilter !== '') obj.searchRecencyFilter = searchRecencyFilter
        if (cache) obj.cache = cache

        if (searchDomainFilterRaw) {
            try {
                obj.searchDomainFilter =
                    typeof searchDomainFilterRaw === 'object' ? searchDomainFilterRaw : JSON.parse(searchDomainFilterRaw)
            } catch (exception) {
                throw new Error('Invalid JSON in Search Domain Filter: ' + exception)
            }
        }

        if (proxyUrl) {
            console.warn('Proxy configuration for ChatPerplexity might require adjustments to FlowiseChatPerplexity wrapper.')
        }

        const perplexityModel = new ChatPerplexity(nodeData.id, obj)
        return perplexityModel
    }
}

module.exports = { nodeClass: ChatPerplexity_ChatModels }
