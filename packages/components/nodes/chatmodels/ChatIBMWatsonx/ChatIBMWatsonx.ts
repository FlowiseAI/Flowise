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
        this.version = 1.0
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
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const cache = nodeData.inputs?.cache as BaseCache
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
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

        const obj: ChatWatsonxInput & WatsonxAuth = {
            ...auth,
            streaming: streaming ?? true,
            model: modelName,
            temperature: temperature ? parseFloat(temperature) : undefined
        }
        if (cache) obj.cache = cache
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)

        const model = new ChatWatsonx(obj)
        return model
    }
}

module.exports = { nodeClass: ChatIBMWatsonx_ChatModels }
