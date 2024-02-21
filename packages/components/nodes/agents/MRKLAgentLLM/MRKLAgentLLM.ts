import { flatten } from 'lodash'
import { AgentExecutor } from 'langchain/agents'
import { pull } from 'langchain/hub'
import { Tool } from '@langchain/core/tools'
import type { PromptTemplate } from '@langchain/core/prompts'
import { BaseLanguageModel } from 'langchain/base_language'
import { additionalCallbacks } from '../../../src/handler'
import { getBaseClasses } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { createReactAgent } from '../../../src/agents'

class MRKLAgentLLM_Agents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'ReAct Agent for LLMs'
        this.name = 'mrklAgentLLM'
        this.version = 1.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'agent.svg'
        this.description = 'Agent that uses the ReAct logic to decide what action to take, optimized to be used with LLMs'
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'Allowed Tools',
                name: 'tools',
                type: 'Tool',
                list: true
            },
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            }
        ]
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        let tools = nodeData.inputs?.tools as Tool[]
        tools = flatten(tools)

        const prompt = await pull<PromptTemplate>('hwchase17/react')

        const agent = await createReactAgent({
            llm: model,
            tools,
            prompt
        })

        const executor = new AgentExecutor({
            agent,
            tools,
            verbose: process.env.DEBUG === 'true' ? true : false
        })

        const callbacks = await additionalCallbacks(nodeData, options)

        const result = await executor.invoke({ input }, { callbacks })

        return result?.output
    }
}

module.exports = { nodeClass: MRKLAgentLLM_Agents }
