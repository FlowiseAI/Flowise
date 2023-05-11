import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ChatOpenAI, OpenAIChatInput } from 'langchain/chat_models/openai'

class ChatOpenAI_ChatModels implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatOpenAI'
        this.name = 'chatOpenAI'
        this.type = 'ChatOpenAI'
        this.icon = 'openai.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around OpenAI large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.inputs = [
            {
                label: 'OpenAI Api Key',
                name: 'openAIApiKey',
                type: 'password'
            },
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
                        label: 'gpt-4-0314',
                        name: 'gpt-4-0314'
                    },
                    {
                        label: 'gpt-4-32k-0314',
                        name: 'gpt-4-32k-0314'
                    },
                    {
                        label: 'gpt-3.5-turbo',
                        name: 'gpt-3.5-turbo'
                    },
                    {
                        label: 'gpt-3.5-turbo-0301',
                        name: 'gpt-3.5-turbo-0301'
                    }
                ],
                default: 'gpt-3.5-turbo',
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                default: 0.9,
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Presence Penalty',
                name: 'presencePenalty',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const openAIApiKey = nodeData.inputs?.openAIApiKey as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string

        const obj: Partial<OpenAIChatInput> & { openAIApiKey?: string } = {
            temperature: parseInt(temperature, 10),
            modelName,
            openAIApiKey
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseInt(topP, 10)
        if (frequencyPenalty) obj.frequencyPenalty = parseInt(frequencyPenalty, 10)
        if (presencePenalty) obj.presencePenalty = parseInt(presencePenalty, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)

        const model = new ChatOpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: ChatOpenAI_ChatModels }
