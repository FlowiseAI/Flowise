import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { OpenAI, ALL_AVAILABLE_OPENAI_MODELS } from 'llamaindex'

class ChatOpenAI_LlamaIndex_LLMs implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    tags: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatOpenAI'
        this.name = 'chatOpenAI_LlamaIndex'
        this.version = 1.0
        this.type = 'ChatOpenAI'
        this.icon = 'openai.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around OpenAI Chat LLM specific for LlamaIndex'
        this.baseClasses = [this.type, 'BaseChatModel_LlamaIndex', ...getBaseClasses(OpenAI)]
        this.tags = ['LlamaIndex']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'gpt-4',
                        name: 'gpt-4'
                    },
                    {
                        label: 'gpt-4-1106-preview',
                        name: 'gpt-4-1106-preview'
                    },
                    {
                        label: 'gpt-4-vision-preview',
                        name: 'gpt-4-vision-preview'
                    },
                    {
                        label: 'gpt-4-0613',
                        name: 'gpt-4-0613'
                    },
                    {
                        label: 'gpt-4-32k',
                        name: 'gpt-4-32k'
                    },
                    {
                        label: 'gpt-4-32k-0613',
                        name: 'gpt-4-32k-0613'
                    },
                    {
                        label: 'gpt-3.5-turbo',
                        name: 'gpt-3.5-turbo'
                    },
                    {
                        label: 'gpt-3.5-turbo-1106',
                        name: 'gpt-3.5-turbo-1106'
                    },
                    {
                        label: 'gpt-3.5-turbo-0613',
                        name: 'gpt-3.5-turbo-0613'
                    },
                    {
                        label: 'gpt-3.5-turbo-16k',
                        name: 'gpt-3.5-turbo-16k'
                    },
                    {
                        label: 'gpt-3.5-turbo-16k-0613',
                        name: 'gpt-3.5-turbo-16k-0613'
                    }
                ],
                default: 'gpt-3.5-turbo',
                optional: true
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
        const modelName = nodeData.inputs?.modelName as keyof typeof ALL_AVAILABLE_OPENAI_MODELS
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const timeout = nodeData.inputs?.timeout as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)

        const obj: Partial<OpenAI> = {
            temperature: parseFloat(temperature),
            model: modelName,
            apiKey: openAIApiKey
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (timeout) obj.timeout = parseInt(timeout, 10)

        const model = new OpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: ChatOpenAI_LlamaIndex_LLMs }
