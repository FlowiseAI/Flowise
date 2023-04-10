import { INode, INodeData, INodeParams } from '../../../src/Interface'

class MRLKAgentLLM_Agents implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'MRLK Agent for LLMs'
        this.name = 'mrlkAgentLLM'
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'agent.svg'
        this.description = 'Agent that uses the ReAct Framework to decide what action to take, optimized to be used with LLMs'
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
                type: 'BaseLanguageModel'
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        return ['AgentExecutor']
    }

    async init(nodeData: INodeData): Promise<any> {
        const { initializeAgentExecutor } = await import('langchain/agents')

        const model = nodeData.inputs?.model
        const tools = nodeData.inputs?.tools

        const executor = await initializeAgentExecutor(tools, model, 'zero-shot-react-description', true)

        return executor
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const executor = nodeData.instance
        const result = await executor.call({ input })

        return result?.output
    }
}

module.exports = { nodeClass: MRLKAgentLLM_Agents }
