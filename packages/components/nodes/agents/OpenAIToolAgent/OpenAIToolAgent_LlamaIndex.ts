import { flatten } from 'lodash'
import { ChatMessage, OpenAI, OpenAIAgent } from 'llamaindex'
import { getBaseClasses } from '../../../src/utils'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams, IUsedTool } from '../../../src/Interface'

class OpenAIFunctionAgent_LlamaIndex_Agents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    sessionId?: string
    badge?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'OpenAI Tool Agent'
        this.name = 'openAIToolAgentLlamaIndex'
        this.version = 1.0
        this.type = 'OpenAIToolAgent'
        this.category = 'Agents'
        this.icon = 'function.svg'
        this.description = `Agent that uses OpenAI Function Calling to pick the tools and args to call using LlamaIndex`
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIAgent)]
        this.tags = ['LlamaIndex']
        this.badge = 'NEW'
        this.inputs = [
            {
                label: 'Tools',
                name: 'tools',
                type: 'Tool_LlamaIndex',
                list: true
            },
            {
                label: 'Memory',
                name: 'memory',
                type: 'BaseChatMemory'
            },
            {
                label: 'OpenAI/Azure Chat Model',
                name: 'model',
                type: 'BaseChatModel_LlamaIndex'
            },
            {
                label: 'System Message',
                name: 'systemMessage',
                type: 'string',
                rows: 4,
                optional: true,
                additionalParams: true
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string): Promise<string | ICommonObject> {
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const model = nodeData.inputs?.model as OpenAI
        const systemMessage = nodeData.inputs?.systemMessage as string
        let tools = nodeData.inputs?.tools
        tools = flatten(tools)

        const chatHistory = [] as ChatMessage[]

        if (systemMessage) {
            chatHistory.push({
                content: systemMessage,
                role: 'system'
            })
        }

        const msgs = (await memory.getChatMessages(this.sessionId, false)) as IMessage[]
        for (const message of msgs) {
            if (message.type === 'apiMessage') {
                chatHistory.push({
                    content: message.message,
                    role: 'assistant'
                })
            } else if (message.type === 'userMessage') {
                chatHistory.push({
                    content: message.message,
                    role: 'user'
                })
            }
        }

        const agent = new OpenAIAgent({
            tools,
            llm: model,
            prefixMessages: chatHistory,
            verbose: process.env.DEBUG === 'true' ? true : false
        })

        let text = ''
        const usedTools: IUsedTool[] = []

        const response = await agent.chat({
            message: input
        })

        if (response.sources.length) {
            for (const sourceTool of response.sources) {
                usedTools.push({
                    tool: sourceTool.toolName,
                    toolInput: sourceTool.rawInput,
                    toolOutput: sourceTool.rawOutput
                })
            }
        }

        text = String(response)

        await memory.addChatMessages(
            [
                {
                    text: input,
                    type: 'userMessage'
                },
                {
                    text: text,
                    type: 'apiMessage'
                }
            ],
            this.sessionId
        )

        return usedTools.length ? { text: text, usedTools } : text
    }
}

module.exports = { nodeClass: OpenAIFunctionAgent_LlamaIndex_Agents }
