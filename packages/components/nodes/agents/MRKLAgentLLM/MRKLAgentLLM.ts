import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { initializeAgentExecutor, AgentExecutor } from 'langchain/agents'
import { Tool } from 'langchain/tools'
import { BaseLLM } from 'langchain/llms/base'
import { getBaseClasses } from '../../../src/utils'

class MRKLAgentLLM_Agents implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'MRKL Agent for LLMs'
        this.name = 'mrklAgentLLM'
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'agent.svg'
        this.description = 'Agent that uses the ReAct Framework to decide what action to take, optimized to be used with LLMs'
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'Allowed Tools',
                name: 'tools',
                type: 'Tool',
                list: true
            },
            {
                label: 'LLM Model',
                name: 'model',
                type: 'BaseLLM'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLLM
        const tools = nodeData.inputs?.tools as Tool[]

        const executor = await initializeAgentExecutor(tools, model, 'zero-shot-react-description', true)
        return executor
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const executor = nodeData.instance as AgentExecutor
        const result = await executor.call({ input })

        return result?.output
    }
}

module.exports = { nodeClass: MRKLAgentLLM_Agents }
