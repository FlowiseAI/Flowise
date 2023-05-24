import { BaseLanguageModel } from 'langchain/base_language'
import { INode, INodeData, INodeParams, PromptRetriever } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { MultiPromptChain } from 'langchain/chains'

class MultiPromptChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Multi Prompt Chain'
        this.name = 'multiPromptChain'
        this.type = 'MultiPromptChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'Chain automatically picks an appropriate prompt from multiple prompt templates'
        this.baseClasses = [this.type, ...getBaseClasses(MultiPromptChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Prompt Retriever',
                name: 'promptRetriever',
                type: 'PromptRetriever',
                list: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const promptRetriever = nodeData.inputs?.promptRetriever as PromptRetriever[]
        const promptNames = []
        const promptDescriptions = []
        const promptTemplates = []

        for (const prompt of promptRetriever) {
            promptNames.push(prompt.name)
            promptDescriptions.push(prompt.description)
            promptTemplates.push(prompt.systemMessage)
        }

        const chain = MultiPromptChain.fromPrompts(model, promptNames, promptDescriptions, promptTemplates, undefined, {
            verbose: process.env.DEBUG === 'true' ? true : false
        } as any)

        return chain
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const chain = nodeData.instance as MultiPromptChain

        const res = await chain.call({ input })

        return res?.text
    }
}

module.exports = { nodeClass: MultiPromptChain_Chains }
