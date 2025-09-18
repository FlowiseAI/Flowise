import { BaseCache } from '@langchain/core/caches'
import { ChatWatsonx, ChatWatsonxInput } from '@langchain/community/chat_models/ibm'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

interface WatsonxAuth {
    watsonxAIApikey?: string
    watsonxAIBearerToken?: string
    watsonxAIUsername?: string
    watsonxAIPassword?: string
    watsonxAIUrl?: string
    watsonxAIAuthType?: string
}

class ChatIBMWatsonx_ChatModels implements INode {
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
        this.label = 'ChatIBMWatsonx'
        this.name = 'chatIBMWatsonx'
        this.version = 2.0
        this.type = 'ChatIBMWatsonx'
        this.icon = 'ibm.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around IBM watsonx.ai foundation models'
        this.baseClasses = [this.type, ...getBaseClasses(ChatWatsonx)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['ibmWatsonx']
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model',
                name: 'modelName',
                type: 'string',
                placeholder: 'mistralai/mistral-large'
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
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true,
                description:
                    "Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim."
            },
            {
                label: 'Log Probs',
                name: 'logprobs',
                type: 'boolean',
                default: false,
                optional: true,
                additionalParams: true,
                description:
                    'Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities of each output token returned in the content of message.'
            },
            {
                label: 'N',
                name: 'n',
                type: 'number',
                step: 1,
                default: 1,
                optional: true,
                additionalParams: true,
                description:
                    'How many chat completion choices to generate for each input message. Note that you will be charged based on the number of generated tokens across all of the choices. Keep n as 1 to minimize costs.'
            },
            {
                label: 'Presence Penalty',
                name: 'presencePenalty',
                type: 'number',
                step: 1,
                default: 1,
                optional: true,
                additionalParams: true,
                description:
                    "Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics."
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                default: 0.1,
                optional: true,
                additionalParams: true,
                description:
                    'An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const cache = nodeData.inputs?.cache as BaseCache
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const logprobs = nodeData.inputs?.logprobs as boolean
        const n = nodeData.inputs?.n as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const topP = nodeData.inputs?.topP as string
        const streaming = nodeData.inputs?.streaming as boolean

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const version = getCredentialParam('version', credentialData, nodeData)
        const serviceUrl = getCredentialParam('serviceUrl', credentialData, nodeData)
        const projectId = getCredentialParam('projectId', credentialData, nodeData)
        const watsonxAIAuthType = getCredentialParam('watsonxAIAuthType', credentialData, nodeData)
        const watsonxAIApikey = getCredentialParam('watsonxAIApikey', credentialData, nodeData)
        const watsonxAIBearerToken = getCredentialParam('watsonxAIBearerToken', credentialData, nodeData)

        const auth = {
            version,
            serviceUrl,
            projectId,
            watsonxAIAuthType,
            watsonxAIApikey,
            watsonxAIBearerToken
        }

        const obj = {
            ...auth,
            streaming: streaming ?? true,
            model: modelName,
            temperature: temperature ? parseFloat(temperature) : undefined
        } as ChatWatsonxInput & WatsonxAuth

        if (cache) obj.cache = cache
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (frequencyPenalty) obj.frequencyPenalty = parseInt(frequencyPenalty, 10)
        if (logprobs) obj.logprobs = logprobs
        if (n) obj.maxTokens = parseInt(n, 10)
        if (presencePenalty) obj.presencePenalty = parseInt(presencePenalty, 10)
        if (topP) obj.topP = parseFloat(topP)

        const model = new ChatWatsonx(obj)
        return model
    }
}

module.exports = { nodeClass: ChatIBMWatsonx_ChatModels }
