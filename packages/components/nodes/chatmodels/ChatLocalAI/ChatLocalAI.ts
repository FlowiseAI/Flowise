import { OpenAIChatInput, ChatOpenAI } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatLocalAI_ChatModels implements INode {
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
        this.label = 'ChatLocalAI'
        this.name = 'chatLocalAI'
        this.version = 2.0
        this.type = 'ChatLocalAI'
        this.icon = 'localai.png'
        this.category = 'Chat Models'
        this.description = 'Use local LLMs like llama.cpp, gpt4all using LocalAI'
        this.baseClasses = [this.type, 'BaseChatModel', ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['localAIApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Base Path',
                name: 'basePath',
                type: 'string',
                placeholder: 'http://localhost:8080/v1'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: 'gpt4all-lora-quantized.bin'
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
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const timeout = nodeData.inputs?.timeout as string
        const basePath = nodeData.inputs?.basePath as string
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const localAIApiKey = getCredentialParam('localAIApiKey', credentialData, nodeData)

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: Partial<OpenAIChatInput> & BaseLLMParams & { openAIApiKey?: string } = {
            temperature: parseFloat(temperature),
            modelName,
            openAIApiKey: 'sk-'
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache
        if (localAIApiKey) obj.openAIApiKey = localAIApiKey

        const model = new ChatOpenAI(obj, { basePath })

        return model
    }
}

module.exports = { nodeClass: ChatLocalAI_ChatModels }
