import { BaseCache } from '@langchain/core/caches'
import { HFInput, HuggingFaceInference } from './core'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatHuggingFace_ChatModels implements INode {
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
        this.label = 'ChatHuggingFace'
        this.name = 'chatHuggingFace'
        this.version = 3.0
        this.type = 'ChatHuggingFace'
        this.icon = 'HuggingFace.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around HuggingFace large language models'
        this.baseClasses = [this.type, 'BaseChatModel', ...getBaseClasses(HuggingFaceInference)]
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
                description:
                    'Model name (e.g., deepseek-ai/DeepSeek-V3.2-Exp:novita). If model includes provider (:) or using router endpoint, leave Endpoint blank.',
                placeholder: 'deepseek-ai/DeepSeek-V3.2-Exp:novita'
            },
            {
                label: 'Endpoint',
                name: 'endpoint',
                type: 'string',
                placeholder: 'https://xyz.eu-west-1.aws.endpoints.huggingface.cloud/gpt2',
                description:
                    'Custom inference endpoint (optional). Not needed for models with providers (:) or router endpoints. Leave blank to use Inference Providers.',
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
            },
            {
                label: 'Stop Sequence',
                name: 'stop',
                type: 'string',
                rows: 4,
                placeholder: 'AI assistant:',
                description: 'Sets the stop sequences to use. Use comma to separate different sequences.',
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
        const cache = nodeData.inputs?.cache as BaseCache
        const stop = nodeData.inputs?.stop as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const huggingFaceApiKey = getCredentialParam('huggingFaceApiKey', credentialData, nodeData)

        if (!huggingFaceApiKey) {
            console.error('[ChatHuggingFace] API key validation failed: No API key found')
            throw new Error('HuggingFace API key is required. Please configure it in the credential settings.')
        }

        if (!huggingFaceApiKey.startsWith('hf_')) {
            console.warn('[ChatHuggingFace] API key format warning: Key does not start with "hf_"')
        }

        const obj: Partial<HFInput> = {
            model,
            apiKey: huggingFaceApiKey
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (hfTopK) obj.topK = parseFloat(hfTopK)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (endpoint) obj.endpointUrl = endpoint
        if (stop) {
            const stopSequences = stop.split(',')
            obj.stopSequences = stopSequences
        }

        const huggingFace = new HuggingFaceInference(obj)
        if (cache) huggingFace.cache = cache
        return huggingFace
    }
}

module.exports = { nodeClass: ChatHuggingFace_ChatModels }
