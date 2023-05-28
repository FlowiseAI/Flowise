import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { AnthropicInput, ChatAnthropic } from 'langchain/chat_models/anthropic'

class ChatAnthropic_ChatModels implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatAnthropic'
        this.name = 'chatAnthropic'
        this.type = 'ChatAnthropic'
        this.icon = 'chatAnthropic.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around ChatAnthropic large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatAnthropic)]
        this.inputs = [
            {
                label: 'ChatAnthropic Api Key',
                name: 'anthropicApiKey',
                type: 'password'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'claude-v1',
                        name: 'claude-v1'
                    },
                    {
                        label: 'claude-v1-100k',
                        name: 'claude-v1-100k'
                    },
                    {
                        label: 'claude-v1.0',
                        name: 'claude-v1.0'
                    },
                    {
                        label: 'claude-v1.2',
                        name: 'claude-v1.2'
                    },
                    {
                        label: 'claude-v1.3',
                        name: 'claude-v1.3'
                    },
                    {
                        label: 'claude-v1.3-100k',
                        name: 'claude-v1.3-100k'
                    },
                    {
                        label: 'claude-instant-v1',
                        name: 'claude-instant-v1'
                    },
                    {
                        label: 'claude-instant-v1-100k',
                        name: 'claude-instant-v1-100k'
                    },
                    {
                        label: 'claude-instant-v1.0',
                        name: 'claude-instant-v1.0'
                    },
                    {
                        label: 'claude-instant-v1.1',
                        name: 'claude-instant-v1.1'
                    },
                    {
                        label: 'claude-instant-v1.1-100k',
                        name: 'claude-instant-v1.1-100k'
                    }
                ],
                default: 'claude-v1',
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
                name: 'maxTokensToSample',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const anthropicApiKey = nodeData.inputs?.anthropicApiKey as string
        const maxTokensToSample = nodeData.inputs?.maxTokensToSample as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string

        const obj: Partial<AnthropicInput> & { anthropicApiKey?: string } = {
            temperature: parseInt(temperature, 10),
            modelName,
            anthropicApiKey
        }

        if (maxTokensToSample) obj.maxTokensToSample = parseInt(maxTokensToSample, 10)
        if (topP) obj.topP = parseInt(topP, 10)
        if (topK) obj.topK = parseInt(topK, 10)

        const model = new ChatAnthropic(obj)
        return model
    }
}

module.exports = { nodeClass: ChatAnthropic_ChatModels }
