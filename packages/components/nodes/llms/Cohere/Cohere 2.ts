import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { Cohere, CohereInput } from 'langchain/llms/cohere'

class Cohere_LLMs implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Cohere'
        this.name = 'cohere'
        this.type = 'Cohere'
        this.icon = 'cohere.png'
        this.category = 'LLMs'
        this.description = 'Wrapper around Cohere large language models'
        this.baseClasses = [this.type, ...getBaseClasses(Cohere)]
        this.inputs = [
            {
                label: 'Cohere Api Key',
                name: 'cohereApiKey',
                type: 'password'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'command',
                        name: 'command'
                    },
                    {
                        label: 'command-light',
                        name: 'command-light'
                    },
                    {
                        label: 'command-nightly',
                        name: 'command-nightly'
                    },
                    {
                        label: 'command-light-nightly',
                        name: 'command-light-nightly'
                    },
                    {
                        label: 'base',
                        name: 'base'
                    },
                    {
                        label: 'base-light',
                        name: 'base-light'
                    }
                ],
                default: 'command',
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                default: 0.7,
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const apiKey = nodeData.inputs?.cohereApiKey as string
        const maxTokens = nodeData.inputs?.maxTokens as string

        const obj: CohereInput = {
            apiKey
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (modelName) obj.model = modelName
        if (temperature) obj.temperature = parseInt(temperature, 10)

        const model = new Cohere(obj)
        return model
    }
}

module.exports = { nodeClass: Cohere_LLMs }
