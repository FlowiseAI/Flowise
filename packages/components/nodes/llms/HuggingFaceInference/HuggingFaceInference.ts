import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { HuggingFaceInference } from 'langchain/llms/hf'

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
        this.description = 'Wrapper around HuggingFace large language models'
        this.baseClasses = [this.type, ...getBaseClasses(HuggingFaceInference)]
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

    async init(nodeData: INodeData): Promise<any> {
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
