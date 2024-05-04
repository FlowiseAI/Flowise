import { BaseCache } from '@langchain/core/caches'
import { NIBittensorChatModel, BittensorInput } from 'langchain/experimental/chat_models/bittensor'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class Bittensor_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'NIBittensorChat'
        this.name = 'NIBittensorChatModel'
        this.version = 2.0
        this.type = 'BittensorChat'
        this.icon = 'NIBittensor.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Bittensor subnet 1 large language models'
        this.baseClasses = [this.type, ...getBaseClasses(NIBittensorChatModel)]
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'System prompt',
                name: 'system_prompt',
                type: 'string',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string): Promise<any> {
        const system_prompt = nodeData.inputs?.system_prompt as string
        const cache = nodeData.inputs?.cache as BaseCache

        const obj: Partial<BittensorInput> = {
            systemPrompt: system_prompt
        }
        if (cache) obj.cache = cache

        const model = new NIBittensorChatModel(obj)
        return model
    }
}

module.exports = { nodeClass: Bittensor_ChatModels }
