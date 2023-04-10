import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class HuggingFaceInference_LLMs implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'HuggingFace Inference'
        this.name = 'huggingFaceInference_LLMs'
        this.type = 'HuggingFaceInference'
        this.icon = 'huggingface.png'
        this.category = 'LLMs'
        this.description = 'Wrapper around OpenAI large language models'
        this.inputs = [
            {
                label: 'Model',
                name: 'model',
                type: 'options',
                options: [
                    {
                        label: 'gpt2',
                        name: 'gpt2'
                    }
                ],
                default: 'gpt2',
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

    async getBaseClasses(): Promise<string[]> {
        const { HuggingFaceInference } = await import('langchain/llms')
        return getBaseClasses(HuggingFaceInference)
    }

    async init(nodeData: INodeData): Promise<any> {
        const { HuggingFaceInference } = await import('langchain/llms')

        const temperature = nodeData.inputs?.temperature as string
        const model = nodeData.inputs?.model as string

        const huggingFace = new HuggingFaceInference({
            temperature: parseInt(temperature, 10),
            model
        })
        return huggingFace
    }
}

module.exports = { nodeClass: HuggingFaceInference_LLMs }
