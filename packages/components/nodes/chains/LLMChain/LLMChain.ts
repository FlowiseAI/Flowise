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
        const prompt = nodeData.instance.prompt.inputVariables // ["product"]
        if (prompt.length > 1) throw new Error('Prompt can only contains 1 literal string {}. Multiples are found')

        const chain = nodeData.instance
        const res = await chain.run(input)

        return res
    }
}

module.exports = { nodeClass: LLMChain_Chains }
