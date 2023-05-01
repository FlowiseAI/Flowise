import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { GPT4All } from './core'

class GPT4All_LLMs implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'GPT4All'
        this.name = 'gpt4All'
        this.type = 'GPT4All'
        this.icon = 'gpt4all.png'
        this.category = 'LLMs'
        this.description = 'Wrapper around GP4All large language models'
        this.baseClasses = [this.type, ...getBaseClasses(GPT4All)]
        this.inputs = [
            {
                label: 'Model File Path',
                name: 'modelFilePath',
                type: 'string',
                placeholder: `C:\\gpt4all\\gpt4all-lora-quantized.bin`
            },
            {
                label: 'Executable File Path',
                name: 'executablePath',
                type: 'string',
                placeholder: `C:\\gpt4all\\gpt4all-lora-quantized-win64`
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const modelPath = nodeData.inputs?.modelFilePath as string
        const executablePath = nodeData.inputs?.executablePath as string

        const llm = new GPT4All({
            modelPath,
            executablePath
        })

        return llm
    }
}

module.exports = { nodeClass: GPT4All_LLMs }
