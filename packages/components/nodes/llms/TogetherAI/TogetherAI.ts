import { ICommonObject, INode, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { TogetherAI, TogetherAIInputs } from '@langchain/community/llms/togetherai'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { INodeData } from '../../../dist/src'
import { BaseCache } from '@langchain/core/caches'

/** https://v01.api.js.langchain.com/classes/langchain_community_llms_togetherai.TogetherAI.html
 https://js.langchain.com/v0.1/docs/integrations/llms/togetherai/ **/

class TogetherAI_LLMs implements INode {
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
        this.label = 'TogetherAI'
        this.name = 'togetherAI'
        this.type = 'TogetherAI'
        this.category = 'LLMS'
        this.description = 'Wrapper around TogetherAI large language models'
        this.baseClasses = [this.type, ...getBaseClasses(TogetherAI)]
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model',
                name: 'model',
                type: 'string',
                description: 'If using own inference endpoint, leave this blank',
                placeholder: '', // todo: check
                optional: false
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: ''
            },
            {
                label: 'Top K',
                name: 'topK',
                type: 'number',
                description:
                    'Reduces the probability of generating nonsense. A higher value (e.g. 100) will give more diverse answers, while a lower value (e.g. 10) will be more conservative.',
                step: 1, // todo: check
                optional: false
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                description:
                    'Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text.',
                step: 0.1,
                optional: false
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                description: 'The temperature of the model. Increasing the temperature will make the model answer more creatively',
                step: 0.1,
                optional: false
            },
            {
                label: 'Repeat Penalty',
                name: 'repeatPenalty',
                type: 'number',
                description:
                    'Sets how strongly to penalize repetitions. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient.',
                step: 0.1,
                optional: false
            },
            {
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                optional: false
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                description: 'Max Tokens parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            }
            // safetyModel? stop?
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.LLM, 'togetherAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const model = nodeData.inputs?.model as string
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const repeatPenalty = nodeData.inputs?.repeatPenalty as string
        const modelName = nodeData.inputs?.modelName as string
        const streaming = nodeData.inputs?.streaming as string

        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const togetherAiApiKey = getCredentialParam('togetherAIApiKey', credentialData, nodeData)

        const obj: TogetherAIInputs = {
            modelName,
            apiKey: togetherAiApiKey
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseFloat(topK)
        //if (streaming) obj.streaming = parseBoolean fixme
        if (repeatPenalty) obj.repetitionPenalty = parseFloat(repeatPenalty)
        if (cache) obj.cache = cache

        const togetherAI = new TogetherAI(obj)
        return togetherAI
    }
}

module.exports = { nodeClass: TogetherAI_LLMs }
