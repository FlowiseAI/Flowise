import { BaseCache } from '@langchain/core/caches'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { NIBittensorLLM, BittensorInput } from 'langchain/experimental/llms/bittensor'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class Bittensor_LLMs implements INode {
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
        this.label = 'NIBittensorLLM'
        this.name = 'NIBittensorLLM'
        this.version = 2.0
        this.type = 'Bittensor'
        this.icon = 'NIBittensor.svg'
        this.category = 'LLMs'
        this.description = 'Wrapper around Bittensor subnet 1 large language models'
        this.baseClasses = [this.type, ...getBaseClasses(NIBittensorLLM)]
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
            },
            {
                label: 'Top Responses',
                name: 'topResponses',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string): Promise<any> {
        const system_prompt = nodeData.inputs?.system_prompt as string
        const topResponses = Number(nodeData.inputs?.topResponses as number)
        const cache = nodeData.inputs?.cache as BaseCache

        const obj: Partial<BittensorInput> & BaseLLMParams = {
            systemPrompt: system_prompt,
            topResponses: topResponses
        }
        if (cache) obj.cache = cache

        const model = new NIBittensorLLM(obj)
        return model
    }
}

module.exports = { nodeClass: Bittensor_LLMs }
