import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { initializeAgentExecutorWithOptions, AgentExecutor } from 'langchain/agents'
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

        const executor = await initializeAgentExecutorWithOptions(tools, model, {
            agentType: 'zero-shot-react-description',
            verbose: true
        })
        return executor
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const executor = nodeData.instance as AgentExecutor
        const result = await executor.call({ input })

        return result?.output
    }

    jsCodeImport(): string {
        return `import { initializeAgentExecutorWithOptions } from 'langchain/agents'`
    }

    jsCode(nodeData: INodeData): string {
        const tools = nodeData.inputs?.tools as string
        const model = nodeData.inputs?.model as string

        const code = `const input = "<your question>"
const tools = ${tools}
const model = ${model}

const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: 'zero-shot-react-description',
    verbose: true
})

const result = await executor.call({ input })

console.log(result)
`
        return code
    }
}

module.exports = { nodeClass: MRKLAgentLLM_Agents }
