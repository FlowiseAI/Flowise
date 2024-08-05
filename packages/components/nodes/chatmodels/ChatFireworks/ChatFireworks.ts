import { BaseCache } from '@langchain/core/caches'
import { ChatFireworks } from '@langchain/community/chat_models/fireworks'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatFireworks_ChatModels implements INode {
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
        this.label = 'ChatFireworks'
        this.name = 'chatFireworks'
        this.version = 1.0
        this.type = 'ChatFireworks'
        this.icon = 'Fireworks.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Fireworks Chat Endpoints'
        this.baseClasses = [this.type, ...getBaseClasses(ChatFireworks)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['fireworksApi']
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
                default: 'accounts/fireworks/models/llama-v2-13b-chat',
                placeholder: 'accounts/fireworks/models/llama-v2-13b-chat'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
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
        const fireworksApiKey = getCredentialParam('fireworksApiKey', credentialData, nodeData)

        const obj: Partial<ChatFireworks> = {
            fireworksApiKey,
            model: modelName,
            modelName,
            temperature: temperature ? parseFloat(temperature) : undefined,
            streaming: streaming ?? true
        }
        if (cache) obj.cache = cache

        const model = new ChatFireworks(obj)
        return model
    }
}

module.exports = { nodeClass: ChatFireworks_ChatModels }
