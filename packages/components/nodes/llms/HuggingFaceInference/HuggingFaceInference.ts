import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { HFInput, HuggingFaceInference } from './core'
import { BaseCache } from 'langchain/schema'

class HuggingFaceInference_LLMs implements INode {
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
        this.label = 'HuggingFace Inference'
        this.name = 'huggingFaceInference_LLMs'
        this.version = 2.0
        this.type = 'HuggingFaceInference'
        this.icon = 'huggingface.png'
        this.category = 'LLMs'
        this.description = 'Wrapper around HuggingFace large language models'
        this.baseClasses = [this.type, ...getBaseClasses(HuggingFaceInference)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['huggingFaceApi']
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
                name: 'model',
                type: 'string',
                description: 'If using own inference endpoint, leave this blank',
                placeholder: 'gpt2',
                optional: true
            },
            {
                label: 'Endpoint',
                name: 'endpoint',
                type: 'string',
                placeholder: 'https://xyz.eu-west-1.aws.endpoints.huggingface.cloud/gpt2',
                description: 'Using your own inference endpoint',
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description: 'Temperature parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                description: 'Max Tokens parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                description: 'Top Probability parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'hfTopK',
                type: 'number',
                step: 0.1,
                description: 'Top K parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                description: 'Frequency Penalty parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const model = nodeData.inputs?.model as string
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const hfTopK = nodeData.inputs?.hfTopK as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const endpoint = nodeData.inputs?.endpoint as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const huggingFaceApiKey = getCredentialParam('huggingFaceApiKey', credentialData, nodeData)

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: Partial<HFInput> = {
            model,
            apiKey: huggingFaceApiKey
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (hfTopK) obj.topK = parseFloat(hfTopK)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (endpoint) obj.endpoint = endpoint

        const huggingFace = new HuggingFaceInference(obj)
        if (cache) huggingFace.cache = cache

        return huggingFace
    }
}

module.exports = { nodeClass: HuggingFaceInference_LLMs }
