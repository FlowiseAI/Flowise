import { flatten } from 'lodash'
import { AgentExecutor } from 'langchain/agents'
import { pull } from 'langchain/hub'
import { Tool } from '@langchain/core/tools'
import type { PromptTemplate } from '@langchain/core/prompts'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { additionalCallbacks } from '../../../src/handler'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { createReactAgent } from '../../../src/agents'

class MRKLAgentChat_Agents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'ReAct Agent for Chat Models'
        this.name = 'mrklAgentChat'
        this.version = 3.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'agent.svg'
        this.description = 'Agent that uses the ReAct logic to decide what action to take, optimized to be used with Chat Models'
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
        this.sessionId = fields?.sessionId
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const model = nodeData.inputs?.model as BaseChatModel
        let tools = nodeData.inputs?.tools as Tool[]
        tools = flatten(tools)

        const promptWithChat = await pull<PromptTemplate>('hwchase17/react-chat')

        const agent = await createReactAgent({
            llm: model,
            tools,
            prompt: promptWithChat
        })

        const executor = new AgentExecutor({
            agent,
            tools,
            verbose: process.env.DEBUG === 'true' ? true : false
        })

        const callbacks = await additionalCallbacks(nodeData, options)

        const prevChatHistory = options.chatHistory
        const chatHistory = ((await memory.getChatMessages(this.sessionId, false, prevChatHistory)) as IMessage[]) ?? []
        const chatHistoryString = chatHistory.map((hist) => hist.message).join('\\n')

        const result = await executor.invoke({ input, chat_history: chatHistoryString }, { callbacks })

        await memory.addChatMessages(
            [
                {
                    text: input,
                    type: 'userMessage'
                },
                {
                    text: result?.output,
                    type: 'apiMessage'
                }
            ],
            this.sessionId
        )

        return result?.output
    }
}

module.exports = { nodeClass: MRKLAgentChat_Agents }
