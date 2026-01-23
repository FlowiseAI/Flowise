import { BaseOutputParser } from '@langchain/core/output_parsers'
import { BaseChatPromptTemplate, BasePromptTemplate } from '@langchain/core/prompts'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { BasePromptValueInterface } from '@langchain/core/prompt_values'
import { AIMessage, HumanMessage, SystemMessage } from 'langchain/schema'

class PromptOutput implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    outputParser: BaseOutputParser

    constructor() {
        this.label = 'Prompt Output'
        this.name = 'PromptOutput'
        this.version = 3.0
        this.type = 'PromptOutput'
        this.icon = 'prompt.svg'
        this.category = 'Prompts'
        this.description = 'Output the final generated prompt, which can be used for corpus collection.'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'BasePromptTemplate'
            }
        ]
        this.outputs = [
            {
                label: 'Output Prompt',
                name: 'output',
                baseClasses: ['json']
            },
            {
                label: 'Ending Node',
                name: 'EndingNode',
                baseClasses: ['json']
            }
        ]
    }

    async init(nodeData: INodeData, _input: string, _options: ICommonObject): Promise<any> {
        const prompt: BasePromptTemplate<any, BasePromptValueInterface, any> = nodeData.inputs?.prompt
        let promptValues: ICommonObject | undefined = nodeData.inputs?.prompt.promptValues as ICommonObject
        if (prompt instanceof BaseChatPromptTemplate) {
            return (await prompt.formatMessages(promptValues)).map((m) => {
                let role: string | null = null

                switch (Object.getPrototypeOf(m).constructor) {
                    case SystemMessage:
                        role = 'system'
                        break
                    case HumanMessage:
                        role = 'user'
                        break
                    case AIMessage:
                        role = 'assistant'
                        break
                    default:
                        role = 'unknown'
                        break
                }
                const message = { role, content: m.content }
                if (m.name) {
                    return { name: m.name, ...message }
                }
                return message
            })
        }
        return await prompt.format(promptValues)
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        return await this.init(nodeData, input, options)
    }
}

module.exports = { nodeClass: PromptOutput }
