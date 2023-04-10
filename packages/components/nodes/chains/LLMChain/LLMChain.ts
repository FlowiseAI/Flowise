import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class LLMChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'LLM Chain'
        this.name = 'llmChain'
        this.type = 'LLMChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'Chain to run queries against LLMs'
        this.inputs = [
            {
                label: 'LLM',
                name: 'llm',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'BasePromptTemplate'
            },
            {
                label: 'Format Prompt Values',
                name: 'promptValues',
                type: 'string',
                rows: 5,
                placeholder: `{
  "input_language": "English",
  "output_language": "French"
}`,
                optional: true
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        const { LLMChain } = await import('langchain/chains')
        return getBaseClasses(LLMChain)
    }

    async init(nodeData: INodeData): Promise<any> {
        const { LLMChain } = await import('langchain/chains')

        const llm = nodeData.inputs?.llm
        const prompt = nodeData.inputs?.prompt

        const chain = new LLMChain({ llm, prompt })
        return chain
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const inputVariables = nodeData.instance.prompt.inputVariables // ["product"]
        const chain = nodeData.instance

        if (inputVariables.length === 1) {
            const res = await chain.run(input)
            return res
        } else if (inputVariables.length > 1) {
            const promptValuesStr = nodeData.inputs?.promptValues as string
            if (!promptValuesStr) throw new Error('Please provide Prompt Values')

            const promptValues = JSON.parse(promptValuesStr.replace(/\s/g, ''))

            let seen = []

            for (const variable of inputVariables) {
                seen.push(variable)
                if (promptValues[variable]) {
                    seen.pop()
                }
            }

            if (seen.length === 1) {
                const options = {
                    ...promptValues,
                    [seen.pop()]: input
                }
                const res = await chain.call(options)
                return res?.text
            } else throw new Error('Please provide Prompt Values')
        } else {
            const res = await chain.run(input)
            return res
        }
    }
}

module.exports = { nodeClass: LLMChain_Chains }
