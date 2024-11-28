import { BaseCache } from '@langchain/core/caches'
import { ChatTogetherAI } from '@langchain/community/chat_models/togetherai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatTogetherAI_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'ChatTogetherAI'
        this.name = 'chatTogetherAI'
        this.version = 2.0
        this.type = 'ChatTogetherAI'
        this.icon = 'togetherai.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around TogetherAI large language models'
        this.baseClasses = [this.type, ...getBaseClasses(ChatTogetherAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['togetherAIApi']
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
                placeholder: 'mixtral-8x7b-32768',
                description: 'Refer to <a target="_blank" href="https://docs.together.ai/docs/inference-models">models</a> page'
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
        const modelName = nodeData.inputs?.modelName as string
        const cache = nodeData.inputs?.cache as BaseCache
        const temperature = nodeData.inputs?.temperature as string
        const streaming = nodeData.inputs?.streaming as boolean

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const togetherAIApiKey = getCredentialParam('togetherAIApiKey', credentialData, nodeData)

        const obj: any = {
            model: modelName,
            temperature: parseFloat(temperature),
            togetherAIApiKey: togetherAIApiKey,
            streaming: streaming ?? true
        }
        if (cache) obj.cache = cache

        const model = new ChatTogetherAI(obj)
        return model
    }
}

module.exports = { nodeClass: ChatTogetherAI_ChatModels }
