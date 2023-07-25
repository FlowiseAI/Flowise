import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { HFInput, HuggingFaceInference } from './core'

class ChatHuggingFace_ChatModels implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatHuggingFace'
        this.name = 'chatHuggingFace'
        this.type = 'ChatHuggingFace'
        this.icon = 'huggingface.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around HuggingFace large language models'
        this.baseClasses = [this.type, 'BaseChatModel', ...getBaseClasses(HuggingFaceInference)]
        this.inputs = [
            {
                label: 'Model',
                name: 'model',
                type: 'string',
                placeholder: 'gpt2'
            },
            {
                label: 'HuggingFace Api Key',
                name: 'apiKey',
                type: 'password'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                description: 'Temperature parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                description: 'Max Tokens parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                description: 'Top Probability parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'hfTopK',
                type: 'number',
                description: 'Top K parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                description: 'Frequency Penalty parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Endpoint',
                name: 'endpoint',
                type: 'string',
                placeholder: 'https://xyz.eu-west-1.aws.endpoints.huggingface.cloud/gpt2',
                description: 'Using your own inference endpoint',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as string
        const apiKey = nodeData.inputs?.apiKey as string
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const hfTopK = nodeData.inputs?.hfTopK as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const endpoint = nodeData.inputs?.endpoint as string

        const obj: Partial<HFInput> = {
            model,
            apiKey
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (hfTopK) obj.topK = parseFloat(hfTopK)
        if (frequencyPenalty) obj.frequencyPenalty = parseInt(frequencyPenalty, 10)
        if (endpoint) obj.endpoint = endpoint

        const huggingFace = new HuggingFaceInference(obj)
        return huggingFace
    }
}

module.exports = { nodeClass: ChatHuggingFace_ChatModels }
