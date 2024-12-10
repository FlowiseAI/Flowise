import { ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src'
import { WatsonxLLM, WatsonxInputLLM } from '@langchain/community/llms/ibm'
import { WatsonxAuth } from '@langchain/community/dist/types/ibm'
import { BaseCache } from '@langchain/core/caches'

class IBMWatsonx_LLMs implements INode {
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
        this.label = 'IBMWatsonx'
        this.name = 'ibmWatsonx'
        this.version = 1.0
        this.type = 'IBMWatsonx'
        this.icon = 'ibm.png'
        this.category = 'LLMs'
        this.description = 'Wrapper around IBM watsonx.ai foundation models'
        this.baseClasses = [this.type, ...getBaseClasses(WatsonxLLM)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['ibmWatsonx']
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
                name: 'modelId',
                type: 'string',
                default: 'ibm/granite-13b-instruct-v2',
                description: 'The name of the model to query.'
            },
            {
                label: 'Decoding Method',
                name: 'decodingMethod',
                type: 'options',
                options: [
                    { label: 'sample', name: 'sample' },
                    { label: 'greedy', name: 'greedy' }
                ],
                default: 'greedy',
                description:
                    'Set decoding to Greedy to always select words with the highest probability. Set decoding to Sampling to customize the variability of word selection.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                type: 'number',
                description:
                    'The topK parameter is used to limit the number of choices for the next predicted word or token. It specifies the maximum number of tokens to consider at each step, based on their probability of occurrence. This technique helps to speed up the generation process and can improve the quality of the generated text by focusing on the most likely options.',
                step: 1,
                default: 50,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                description:
                    'The topP (nucleus) parameter is used to dynamically adjust the number of choices for each predicted token based on the cumulative probabilities. It specifies a probability threshold, below which all less likely tokens are filtered out. This technique helps to maintain diversity and generate more fluent and natural-sounding text.',
                step: 0.1,
                default: 0.7,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                description:
                    'A decimal number that determines the degree of randomness in the response. A value of 1 will always yield the same output. A temperature less than 1 favors more correctness and is appropriate for question answering or summarization. A value greater than 1 introduces more randomness in the output.',
                step: 0.1,
                default: 0.7,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Repeat Penalty',
                name: 'repetitionPenalty',
                type: 'number',
                description:
                    'A number that controls the diversity of generated text by reducing the likelihood of repeated sequences. Higher values decrease repetition.',
                step: 0.1,
                default: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: false,
                description: 'Whether or not to stream tokens as they are generated.'
            },
            {
                label: 'Max New Tokens',
                name: 'maxNewTokens',
                type: 'number',
                step: 1,
                default: 100,
                description:
                    'The maximum number of new tokens to be generated. The maximum supported value for this field depends on the model being used.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Min New Tokens',
                name: 'minNewTokens',
                type: 'number',
                step: 1,
                default: 1,
                description: 'If stop sequences are given, they are ignored until minimum tokens are generated.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Stop Sequence',
                name: 'stopSequence',
                type: 'string',
                rows: 4,
                placeholder: 'AI assistant:',
                description: 'A list of tokens at which the generation should stop.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Include Stop Sequence',
                name: 'includeStopSequence',
                type: 'boolean',
                default: false,
                description:
                    'Pass false to omit matched stop sequences from the end of the output text. The default is true, meaning that the output will end with the stop sequence text when matched.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Random Seed',
                name: 'randomSeed',
                type: 'number',
                placeholder: '62345',
                description: 'Random number generator seed to use in sampling mode for experimental repeatability.',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const decodingMethod = nodeData.inputs?.decodingMethod as string
        const temperature = nodeData.inputs?.temperature as string
        const maxNewTokens = nodeData.inputs?.maxNewTokens as string
        const minNewTokens = nodeData.inputs?.minNewTokens as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const repetitionPenalty = nodeData.inputs?.repetitionPenalty as string
        const modelId = nodeData.inputs?.modelId as string
        const stopSequence = nodeData.inputs?.stopSequence as string
        const randomSeed = nodeData.inputs?.randomSeed as string
        const includeStopSequence = nodeData.inputs?.includeStopSequence as boolean
        const streaming = nodeData.inputs?.streaming as boolean

        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const version = getCredentialParam('version', credentialData, nodeData)
        const serviceUrl = getCredentialParam('serviceUrl', credentialData, nodeData)
        const projectId = getCredentialParam('projectId', credentialData, nodeData)
        const watsonxAIAuthType = getCredentialParam('watsonxAIAuthType', credentialData, nodeData)
        const watsonxAIApikey = getCredentialParam('watsonxAIApikey', credentialData, nodeData)
        const watsonxAIBearerToken = getCredentialParam('watsonxAIBearerToken', credentialData, nodeData)

        const auth = {
            version,
            serviceUrl,
            projectId,
            watsonxAIAuthType,
            watsonxAIApikey,
            watsonxAIBearerToken
        }

        const obj: WatsonxInputLLM & WatsonxAuth = {
            ...auth,
            model: modelId,
            streaming: streaming ?? true
        }

        if (decodingMethod) obj.decodingMethod = decodingMethod
        if (repetitionPenalty) obj.repetitionPenalty = parseFloat(repetitionPenalty)
        if (maxNewTokens) obj.maxNewTokens = parseInt(maxNewTokens)
        if (minNewTokens) obj.minNewTokens = parseInt(minNewTokens)
        if (decodingMethod === 'sample') {
            if (temperature) obj.temperature = parseFloat(temperature)
            if (topP) obj.topP = parseFloat(topP)
            if (topK) obj.topK = parseInt(topK)
        }
        if (stopSequence) {
            obj.stopSequence = stopSequence.split(', ') || ['']
        }
        if (randomSeed) {
            obj.randomSeed = parseInt(randomSeed)
        }
        if (includeStopSequence) {
            obj.includeStopSequence = includeStopSequence
        }

        if (cache) obj.cache = cache

        const watsonXAI = new WatsonxLLM(obj)
        return watsonXAI
    }
}

module.exports = { nodeClass: IBMWatsonx_LLMs }
