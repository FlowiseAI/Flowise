import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { LLMChain } from 'langchain/chains'
import { BaseLanguageModel } from 'langchain/base_language'
import { BasePromptTemplate } from 'langchain/prompts'

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
        this.baseClasses = [this.type, ...getBaseClasses(LLMChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
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

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const prompt = nodeData.inputs?.prompt as BasePromptTemplate

        const chain = new LLMChain({ llm: model, prompt })
        return chain
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const inputVariables = nodeData.instance.prompt.inputVariables as string[] // ["product"]
        const chain = nodeData.instance as LLMChain

        if (inputVariables.length === 1) {
            const res = await chain.run(input)
            return res
        } else if (inputVariables.length > 1) {
            const promptValuesStr = nodeData.inputs?.promptValues as string
            if (!promptValuesStr) throw new Error('Please provide Prompt Values')

            const promptValues = JSON.parse(promptValuesStr.replace(/\s/g, ''))

            let seen: string[] = []

            for (const variable of inputVariables) {
                seen.push(variable)
                if (promptValues[variable]) {
                    seen.pop()
                }
            }

            if (seen.length === 1) {
                const lastValue = seen.pop()
                if (!lastValue) throw new Error('Please provide Prompt Values')
                const options = {
                    ...promptValues,
                    [lastValue]: input
                }
                const res = await chain.call(options)
                return res?.text
            } else {
                throw new Error('Please provide Prompt Values')
            }
        } else {
            const res = await chain.run(input)
            return res
        }
    }
}

module.exports = { nodeClass: LLMChain_Chains }
