import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

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
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        const { ChatOpenAI } = await import('langchain/chat_models')
        return getBaseClasses(ChatOpenAI)
    }

    async init(nodeData: INodeData): Promise<any> {
        const { ChatOpenAI } = await import('langchain/chat_models')

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const openAIApiKey = nodeData.inputs?.openAIApiKey as string

        const model = new ChatOpenAI({
            temperature: parseInt(temperature, 10),
            modelName,
            openAIApiKey
        })
        return model
    }
}

module.exports = { nodeClass: ChatOpenAI_ChatModels }
