import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { GoogleVertexAI, GoogleVertexAITextInput } from 'langchain/llms/googlevertexai'

class GoogleVertexAI_LLMs implements INode {
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
        this.label = 'GoogleVertexAI'
        this.name = 'googlevertexai'
        this.version = 1.0
        this.type = 'GoogleVertexAI'
        this.icon = 'vertexai.svg'
        this.category = 'LLMs'
        this.description = 'Wrapper around GoogleVertexAI large language models'
        this.baseClasses = [this.type, ...getBaseClasses(GoogleVertexAI)]
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'text-bison',
                        name: 'text-bison'
                    },
                    {
                        label: 'code-bison',
                        name: 'code-bison'
                    },
                    {
                        label: 'code-gecko',
                        name: 'code-gecko'
                    }
                ],
                default: 'text-bison'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true
            },
            {
                label: 'max Output Tokens',
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
            }
        ]
    }

    async init(nodeData: INodeData, _: string): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const model = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string

        const obj: Partial<GoogleVertexAITextInput> = {
            temperature: parseFloat(temperature),
            model
        }

        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)

        const llm_model = new GoogleVertexAI(obj)
        return llm_model
    }
}

module.exports = { nodeClass: GoogleVertexAI_LLMs }
