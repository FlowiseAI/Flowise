import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ChatGoogleVertexAI, GoogleVertexAIChatInput } from 'langchain/chat_models/googlevertexai'

class GoogleVertexAI_ChatModels implements INode {
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
        this.label = 'ChatGoogleVertexAI'
        this.name = 'chatGoogleVertexAI'
        this.version = 1.0
        this.type = 'ChatGoogleVertexAI'
        this.icon = 'vertexai.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around VertexAI large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatGoogleVertexAI)]
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'chat-bison',
                        name: 'chat-bison'
                    },
                    {
                        label: 'codechat-bison',
                        name: 'codechat-bison'
                    },
                    {
                        label: 'chat-bison@001',
                        name: 'chat-bison@001'
                    },
                    {
                        label: 'codechat-bison@001',
                        name: 'codechat-bison@001'
                    },
                ],
                default: 'chat-bison',
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
                label: 'Max Output Tokens',
                name: 'maxOutputTokens',
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
        ]
    }

    async init(nodeData: INodeData, _: string,): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const model = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string

        const obj: Partial<GoogleVertexAIChatInput> = {
            temperature: parseFloat(temperature),
            model,
        }

        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)



        const chat_model = new ChatGoogleVertexAI(obj)
        return chat_model
    }
}

module.exports = { nodeClass: GoogleVertexAI_ChatModels }
