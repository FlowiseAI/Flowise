import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { OpenAIChat } from 'langchain/llms/openai'
import { OpenAIChatInput } from 'langchain/chat_models/openai'

class ChatLocalAI_ChatModels implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatLocalAI'
        this.name = 'chatLocalAI'
        this.type = 'ChatLocalAI'
        this.icon = 'localai.png'
        this.category = 'Chat Models'
        this.description = 'Use local LLMs like llama.cpp, gpt4all using LocalAI'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIChat)]
        this.inputs = [
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
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const timeout = nodeData.inputs?.timeout as string
        const basePath = nodeData.inputs?.basePath as string

        const obj: Partial<OpenAIChatInput> & { openAIApiKey?: string } = {
            temperature: parseInt(temperature, 10),
            modelName,
            openAIApiKey: 'sk-'
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseInt(topP, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)

        const model = new OpenAIChat(obj, { basePath })

        return model
    }
}

module.exports = { nodeClass: ChatLocalAI_ChatModels }
