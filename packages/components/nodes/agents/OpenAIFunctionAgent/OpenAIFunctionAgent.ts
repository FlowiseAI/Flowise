import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { initializeAgentExecutorWithOptions, AgentExecutor } from 'langchain/agents'
import { getBaseClasses, mapChatHistory } from '../../../src/utils'
import { BaseLanguageModel } from 'langchain/base_language'
import { flatten } from 'lodash'
import { BaseChatMemory } from 'langchain/memory'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'

class OpenAIFunctionAgent_Agents implements INode {
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
        this.label = 'OpenAI Function Agent'
        this.name = 'openAIFunctionAgent'
        this.version = 3.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'openai.png'
        this.description = `An agent that uses Function Calling to pick the tool and args to call`
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'Allowed Tools',
                name: 'tools',
                type: 'Tool',
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
                type: 'BaseChatModel'
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
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const memory = nodeData.inputs?.memory as BaseChatMemory
        const systemMessage = nodeData.inputs?.systemMessage as string

        let tools = nodeData.inputs?.tools
        tools = flatten(tools)

        const executor = await initializeAgentExecutorWithOptions(tools, model, {
            agentType: 'openai-functions',
            verbose: process.env.DEBUG === 'true' ? true : false,
            agentArgs: {
                prefix: systemMessage ?? `You are a helpful AI assistant.`
            }
        })
        if (memory) executor.memory = memory

        return executor
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const executor = nodeData.instance as AgentExecutor
        const memory = nodeData.inputs?.memory as BaseChatMemory

        if (options && options.chatHistory) {
            const chatHistoryClassName = memory.chatHistory.constructor.name
            // Only replace when its In-Memory
            if (chatHistoryClassName && chatHistoryClassName === 'ChatMessageHistory') {
                memory.chatHistory = mapChatHistory(options)
                executor.memory = memory
            }
        }

        ;(executor.memory as any).returnMessages = true // Return true for BaseChatModel

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            const result = await executor.run(input, [loggerHandler, handler, ...callbacks])
            return result
        } else {
            const result = await executor.run(input, [loggerHandler, ...callbacks])
            return result
        }
    }
}

module.exports = { nodeClass: OpenAIFunctionAgent_Agents }
