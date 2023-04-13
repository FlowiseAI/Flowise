import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { OpenAI } from 'langchain/llms/openai'

class OpenAI_LLMs implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAI'
        this.name = 'openAI'
        this.type = 'OpenAI'
        this.icon = 'openai.png'
        this.category = 'LLMs'
        this.description = 'Wrapper around OpenAI large language models'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAI)]
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
                        label: 'text-davinci-003',
                        name: 'text-davinci-003'
                    },
                    {
                        label: 'text-davinci-002',
                        name: 'text-davinci-002'
                    },
                    {
                        label: 'text-curie-001',
                        name: 'text-curie-001'
                    },
                    {
                        label: 'text-babbage-001',
                        name: 'text-babbage-001'
                    }
                ],
                default: 'text-davinci-003',
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                default: 0.7,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const openAIApiKey = nodeData.inputs?.openAIApiKey as string

        const model = new OpenAI({
            temperature: parseInt(temperature, 10),
            modelName,
            openAIApiKey
        })
        return model
    }
}

module.exports = { nodeClass: OpenAI_LLMs }
