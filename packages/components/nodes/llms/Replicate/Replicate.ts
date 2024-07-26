import { Replicate, ReplicateInput } from '@langchain/community/llms/replicate'
import { BaseCache } from '@langchain/core/caches'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class Replicate_LLMs implements INode {
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
        this.label = 'Replicate'
        this.name = 'replicate'
        this.version = 2.0
        this.type = 'Replicate'
        this.icon = 'replicate.svg'
        this.category = 'LLMs'
        this.description = 'Use Replicate to run open source models on cloud'
        this.baseClasses = [this.type, 'BaseChatModel', ...getBaseClasses(Replicate)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['replicateApi']
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
                placeholder: 'a16z-infra/llama13b-v2-chat:df7690f1994d94e96ad9d568eac121aecf50684a0b0963b25a41cc40061269e5',
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description:
                    'Adjusts randomness of outputs, greater than 1 is random and 0 is deterministic, 0.75 is a good starting value.',
                default: 0.7,
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                description: 'Maximum number of tokens to generate. A word is generally 2-3 tokens',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                description:
                    'When decoding text, samples from the top p percentage of most likely tokens; lower to ignore less likely tokens',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Repetition Penalty',
                name: 'repetitionPenalty',
                type: 'number',
                step: 0.1,
                description:
                    'Penalty for repeated words in generated text; 1 is no penalty, values greater than 1 discourage repetition, less than 1 encourage it. (minimum: 0.01; maximum: 5)',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Additional Inputs',
                name: 'additionalInputs',
                type: 'json',
                description:
                    'Each model has different parameters, refer to the specific model accepted inputs. For example: <a target="_blank" href="https://replicate.com/a16z-infra/llama13b-v2-chat/api#inputs">llama13b-v2</a>',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.model as string
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const repetitionPenalty = nodeData.inputs?.repetitionPenalty as string
        const additionalInputs = nodeData.inputs?.additionalInputs as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('replicateApiKey', credentialData, nodeData)

        const version = modelName.split(':').pop()
        const name = modelName.split(':')[0].split('/').pop()
        const org = modelName.split(':')[0].split('/')[0]

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ReplicateInput & BaseLLMParams = {
            model: `${org}/${name}:${version}`,
            apiKey
        }

        let inputs: any = {}
        if (maxTokens) inputs.max_length = parseInt(maxTokens, 10)
        if (temperature) inputs.temperature = parseFloat(temperature)
        if (topP) inputs.top_p = parseFloat(topP)
        if (repetitionPenalty) inputs.repetition_penalty = parseFloat(repetitionPenalty)
        if (additionalInputs) {
            const parsedInputs =
                typeof additionalInputs === 'object' ? additionalInputs : additionalInputs ? JSON.parse(additionalInputs) : {}
            inputs = { ...inputs, ...parsedInputs }
        }
        if (Object.keys(inputs).length) obj.input = inputs

        if (cache) obj.cache = cache

        const model = new Replicate(obj)
        return model
    }
}

module.exports = { nodeClass: Replicate_LLMs }
