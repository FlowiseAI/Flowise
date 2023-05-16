import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { initializeAgentExecutorWithOptions, AgentExecutor } from 'langchain/agents'
import { BaseChatModel } from 'langchain/chat_models/base'
import { getBaseClasses } from '../../../src/utils'
import { Tool } from 'langchain/tools'

class MRKLAgentChat_Agents implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'MRKL Agent for Chat Models'
        this.name = 'mrklAgentChat'
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'agent.svg'
        this.description = 'Agent that uses the ReAct Framework to decide what action to take, optimized to be used with Chat Models'
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'Allowed Tools',
                name: 'tools',
                type: 'Tool',
                list: true
            },
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseChatModel
        let tools = nodeData.inputs?.tools as Tool[]
        tools = tools.flat()
        const executor = await initializeAgentExecutorWithOptions(tools, model, {
            agentType: 'chat-zero-shot-react-description',
            verbose: true
        })
        return executor
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const executor = nodeData.instance as AgentExecutor
        const result = await executor.call({ input })

        return result?.output
    }
}

module.exports = { nodeClass: MRKLAgentChat_Agents }
