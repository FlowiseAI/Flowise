import { BaseCache } from '@langchain/core/caches'
import { ChatMistralAI, ChatMistralAIInput } from '@langchain/mistralai'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

class ChatMistral_ChatModels implements INode {
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
        this.label = 'ChatMistralAI'
        this.name = 'chatMistralAI'
        this.version = 3.0
        this.type = 'ChatMistralAI'
        this.icon = 'MistralAI.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Mistral large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatMistralAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mistralAIApi']
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
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'mistral-tiny'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                description:
                    'What sampling temperature to use, between 0.0 and 1.0. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Max Output Tokens',
                name: 'maxOutputTokens',
                type: 'number',
                description: 'The maximum number of tokens to generate in the completion.',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                description:
                    'Nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Random Seed',
                name: 'randomSeed',
                type: 'number',
                description: 'The seed to use for random sampling. If set, different calls will generate deterministic results.',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Safe Mode',
                name: 'safeMode',
                type: 'boolean',
                description: 'Whether to inject a safety prompt before all conversations.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Override Endpoint',
                name: 'overrideEndpoint',
                type: 'string',
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatMistralAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('mistralAIAPIKey', credentialData, nodeData)

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const safeMode = nodeData.inputs?.safeMode as boolean
        const randomSeed = nodeData.inputs?.safeMode as string
        const overrideEndpoint = nodeData.inputs?.overrideEndpoint as string
        const streaming = nodeData.inputs?.streaming as boolean
        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ChatMistralAIInput = {
            apiKey: apiKey,
            modelName: modelName,
            streaming: streaming ?? true
        }

        if (maxOutputTokens) obj.maxTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (cache) obj.cache = cache
        if (temperature) obj.temperature = parseFloat(temperature)
        if (randomSeed) obj.randomSeed = parseFloat(randomSeed)
        if (safeMode) obj.safeMode = safeMode
        if (overrideEndpoint) obj.endpoint = overrideEndpoint

        const model = new ChatMistralAI(obj)

        return model
    }
}

module.exports = { nodeClass: ChatMistral_ChatModels }
