import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { Anthropic } from 'llamaindex'

class ChatAnthropic_LlamaIndex_ChatModels implements INode {
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
        this.label = 'ChatAnthropic'
        this.name = 'chatAnthropic_LlamaIndex'
        this.version = 3.0
        this.type = 'ChatAnthropic'
        this.icon = 'Anthropic.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around ChatAnthropic LLM specific for LlamaIndex'
        this.baseClasses = [this.type, 'BaseChatModel_LlamaIndex', ...getBaseClasses(Anthropic)]
        this.tags = ['LlamaIndex']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['anthropicApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'claude-3-haiku'
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
            return await getModels(MODEL_TYPE.CHAT, 'chatAnthropic_LlamaIndex')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as 'claude-3-opus' | 'claude-3-sonnet' | 'claude-2.1' | 'claude-instant-1.2'
        const maxTokensToSample = nodeData.inputs?.maxTokensToSample as string
        const topP = nodeData.inputs?.topP as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const anthropicApiKey = getCredentialParam('anthropicApiKey', credentialData, nodeData)

        const obj: Partial<Anthropic> = {
            temperature: parseFloat(temperature),
            model: modelName,
            apiKey: anthropicApiKey
        }

        if (maxTokensToSample) obj.maxTokens = parseInt(maxTokensToSample, 10)
        if (topP) obj.topP = parseFloat(topP)

        const model = new Anthropic(obj)
        return model
    }
}

module.exports = { nodeClass: ChatAnthropic_LlamaIndex_ChatModels }
