import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { initializeAgentExecutor, AgentExecutor } from 'langchain/agents'
import { AIPluginTool } from 'langchain/tools'
import { BaseChatModel } from 'langchain/chat_models/base'
import { getBaseClasses } from '../../../src/utils'

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
        const tools = nodeData.inputs?.tools

        const allowedTools = []
        for (let i = 0; i < tools.length; i += 1) {
            if (tools[i].pluginUrl) {
                const pluginURL: string = tools[i].pluginUrl
                const aiplugin = await AIPluginTool.fromPluginUrl(pluginURL)
                allowedTools.push(aiplugin)
            } else {
                allowedTools.push(tools[i])
            }
        }

        const executor = await initializeAgentExecutor(allowedTools, model, 'chat-zero-shot-react-description', true)
        return executor
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const executor = nodeData.instance as AgentExecutor
        const result = await executor.call({ input })

        return result?.output
    }
}

module.exports = { nodeClass: MRKLAgentChat_Agents }
