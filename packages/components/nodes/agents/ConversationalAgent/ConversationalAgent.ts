import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { initializeAgentExecutorWithOptions, AgentExecutor } from 'langchain/agents'
import { Tool } from 'langchain/tools'
import { BaseChatModel } from 'langchain/chat_models/base'
import { BaseChatMemory } from 'langchain/memory'
import { getBaseClasses } from '../../../src/utils'

class ConversationalAgent_Agents implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Conversational Agent'
        this.name = 'conversationalAgent'
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'agent.svg'
        this.description = 'Conversational agent for a chat model. It will utilize chat specific prompts'
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
            },
            {
                label: 'Memory',
                name: 'memory',
                type: 'BaseChatMemory'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseChatModel
        const tools = nodeData.inputs?.tools as Tool[]
        const memory = nodeData.inputs?.memory as BaseChatMemory

        const executor = await initializeAgentExecutorWithOptions(tools, model, {
            agentType: 'chat-conversational-react-description',
            verbose: true
        })
        executor.memory = memory
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
        const memory = nodeData.inputs?.memory as string

        const code = `const input = "<your question>"
const tools = ${tools}
const model = ${model}
const memory = ${memory}

const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: 'chat-conversational-react-description',
    verbose: true
})
executor.memory = memory

const result = await executor.call({ input })

console.log(result)
`
        return code
    }
}

module.exports = { nodeClass: ConversationalAgent_Agents }
