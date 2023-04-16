import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
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
    outputs: INodeOutputsValue[]

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
                label: 'Chain Name',
                name: 'chainName',
                type: 'string',
                placeholder: 'Task Creation Chain',
                optional: true
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
                optional: true,
                acceptVariable: true,
                list: true
            }
        ]
        this.outputs = [
            {
                label: this.label,
                name: this.name,
                type: this.type
            },
            {
                label: 'Output Prediction',
                name: 'outputPrediction',
                type: 'string'
            }
        ]
    }

    async init(nodeData: INodeData, input: string): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const prompt = nodeData.inputs?.prompt as BasePromptTemplate
        const output = nodeData.outputs?.output as string
        const promptValuesStr = nodeData.inputs?.promptValues as string

        if (output === this.name) {
            const chain = new LLMChain({ llm: model, prompt })
            return chain
        } else if (output === 'outputPrediction') {
            const chain = new LLMChain({ llm: model, prompt })
            const inputVariables = chain.prompt.inputVariables as string[] // ["product"]
            const res = await runPrediction(inputVariables, chain, input, promptValuesStr)
            // eslint-disable-next-line no-console
            console.log('\x1b[92m\x1b[1m\n*****OUTPUT PREDICTION*****\n\x1b[0m\x1b[0m')
            // eslint-disable-next-line no-console
            console.log(res)
            return res
        }
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const inputVariables = nodeData.instance.prompt.inputVariables as string[] // ["product"]
        const chain = nodeData.instance as LLMChain
        const promptValuesStr = nodeData.inputs?.promptValues as string
        const res = await runPrediction(inputVariables, chain, input, promptValuesStr)
        // eslint-disable-next-line no-console
        console.log('\x1b[93m\x1b[1m\n*****FINAL RESULT*****\n\x1b[0m\x1b[0m')
        // eslint-disable-next-line no-console
        console.log(res)
        return res
    }
}

const runPrediction = async (inputVariables: string[], chain: LLMChain, input: string, promptValuesStr: string) => {
    if (inputVariables.length === 1) {
        const res = await chain.run(input)
        return res
    } else if (inputVariables.length > 1) {
        if (!promptValuesStr) throw new Error('Please provide Prompt Values')
        const promptValues = JSON.parse(promptValuesStr.replace(/\s/g, ''))

        let seen: string[] = []

        for (const variable of inputVariables) {
            seen.push(variable)
            if (promptValues[variable]) {
                seen.pop()
            }
        }

        if (seen.length === 0) {
            // All inputVariables have fixed values specified
            const options = {
                ...promptValues
            }
            const res = await chain.call(options)
            return res?.text
        } else if (seen.length === 1) {
            // If one inputVariable is not specify, use input (user's question) as value
            const lastValue = seen.pop()
            if (!lastValue) throw new Error('Please provide Prompt Values')
            const options = {
                ...promptValues,
                [lastValue]: input
            }
            const res = await chain.call(options)
            return res?.text
        } else {
            throw new Error(`Please provide Prompt Values for: ${seen.join(', ')}`)
        }
    } else {
        const res = await chain.run(input)
        return res
    }
}

module.exports = { nodeClass: LLMChain_Chains }
