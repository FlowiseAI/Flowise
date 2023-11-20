import { BaseLanguageModel } from 'langchain/base_language'
import { ICommonObject, INode, INodeData, INodeParams, PromptRetriever } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { MultiPromptChain } from 'langchain/chains'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'

class MultiPromptChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Multi Prompt Chain'
        this.name = 'multiPromptChain'
        this.version = 1.0
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

        const chain = MultiPromptChain.fromLLMAndPrompts(model, {
            promptNames,
            promptDescriptions,
            promptTemplates,
            llmChainOpts: { verbose: process.env.DEBUG === 'true' ? true : false }
        })

        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const chain = nodeData.instance as MultiPromptChain
        const obj = { input }

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId, 2)
            const res = await chain.call(obj, [loggerHandler, handler, ...callbacks])
            return res?.text
        } else {
            const res = await chain.call(obj, [loggerHandler, ...callbacks])
            return res?.text
        }
    }
}

module.exports = { nodeClass: MultiPromptChain_Chains }
