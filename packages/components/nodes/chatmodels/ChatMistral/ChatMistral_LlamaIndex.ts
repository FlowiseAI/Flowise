import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ALL_AVAILABLE_MISTRAL_MODELS, MistralAI } from 'llamaindex'

class ChatMistral_LlamaIndex_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    tags: string[]
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatMistral'
        this.name = 'chatMistral_LlamaIndex'
        this.version = 1.0
        this.type = 'ChatMistral'
        this.icon = 'MistralAI.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around ChatMistral LLM specific for LlamaIndex'
        this.baseClasses = [this.type, 'BaseChatModel_LlamaIndex', ...getBaseClasses(MistralAI)]
        this.tags = ['LlamaIndex']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mistralAIApi']
        }
        this.inputs = [
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
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokensToSample',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatMistral_LlamaIndex')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as keyof typeof ALL_AVAILABLE_MISTRAL_MODELS
        const maxTokensToSample = nodeData.inputs?.maxTokensToSample as string
        const topP = nodeData.inputs?.topP as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('mistralAIAPIKey', credentialData, nodeData)

        const obj: Partial<MistralAI> = {
            temperature: parseFloat(temperature),
            model: modelName,
            apiKey: apiKey
        }

        if (maxTokensToSample) obj.maxTokens = parseInt(maxTokensToSample, 10)
        if (topP) obj.topP = parseFloat(topP)

        const model = new MistralAI(obj)
        return model
    }
}

module.exports = { nodeClass: ChatMistral_LlamaIndex_ChatModels }
