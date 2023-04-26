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
                type: 'string',
                placeholder: 'gpt2'
            },
            {
                label: 'HuggingFace Api Key',
                name: 'apiKey',
                type: 'password'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as string
        const apiKey = nodeData.inputs?.apiKey as string

        const huggingFace = new HuggingFaceInference({
            model,
            apiKey
        })
        return huggingFace
    }

    jsCodeImport(): string {
        return `import { HuggingFaceInference } from 'langchain/llms/hf'`
    }

    jsCode(nodeData: INodeData): string {
        const model = nodeData.inputs?.model as string
        const apiKey = nodeData.inputs?.apiKey as string

        const code = `new HuggingFaceInference({
    model: ${model},
    apiKey: "${apiKey}"
})`
        return code
    }
}

module.exports = { nodeClass: HuggingFaceInference_LLMs }
