import { BaseCache } from '@langchain/core/caches'
import { ChatOpenAI } from "@langchain/openai"
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatSambanova_ChatModels implements INode {
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
        this.label = 'ChatSambanova'
        this.name = 'chatSambanova'
        this.version = 2.0
        this.type = 'ChatSambanova'
        this.icon = 'sambanova.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Sambanova Chat Endpoints'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['sambanovaApi']
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
                default: 'Meta-Llama-3.3-70B-Instruct',
                placeholder: 'Meta-Llama-3.3-70B-Instruct'
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
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const cache = nodeData.inputs?.cache as BaseCache
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const streaming = nodeData.inputs?.streaming as boolean

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const sambanovaApiKey = getCredentialParam('sambanovaApiKey', credentialData, nodeData)

        const obj: any = {
            model: modelName,
            temperature: temperature ? parseFloat(temperature) : undefined,
            streaming: streaming ?? true,
            configuration: {
            baseURL: 'ttps://api.sambanova.ai/v1',
            apiKey: sambanovaApiKey,
        },
            sambanovaApiKey,
        }
        if (cache) obj.cache = cache

        const model = new ChatOpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: ChatSambanova_ChatModels }
