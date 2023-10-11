import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { initializeAgentExecutorWithOptions, AgentExecutor } from 'langchain/agents'
import { getBaseClasses, mapChatHistory } from '../../../src/utils'
import { flatten } from 'lodash'
import { BaseChatMemory } from 'langchain/memory'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'

const defaultMessage = `Do your best to answer the questions. Feel free to use any tools available to look up relevant information, only if necessary.`

class ConversationalRetrievalAgent_Agents implements INode {
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
        this.label = 'Conversational Retrieval Agent'
        this.name = 'conversationalRetrievalAgent'
        this.version = 1.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'agent.svg'
        this.description = `An agent optimized for retrieval during conversation, answering questions based on past dialogue, all using OpenAI's Function Calling`
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
                label: 'OpenAI Chat Model',
                name: 'model',
                type: 'ChatOpenAI'
            },
            {
                label: 'System Message',
                name: 'systemMessage',
                type: 'string',
                default: defaultMessage,
                rows: 4,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model
        const memory = nodeData.inputs?.memory as BaseChatMemory
        const systemMessage = nodeData.inputs?.systemMessage as string

        let tools = nodeData.inputs?.tools
        tools = flatten(tools)

        const executor = await initializeAgentExecutorWithOptions(tools, model, {
            agentType: 'openai-functions',
            verbose: process.env.DEBUG === 'true' ? true : false,
            agentArgs: {
                prefix: systemMessage ?? defaultMessage
            },
            returnIntermediateSteps: true
        })
        executor.memory = memory
        return executor
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const executor = nodeData.instance as AgentExecutor

        if (executor.memory) {
            ;(executor.memory as any).memoryKey = 'chat_history'
            ;(executor.memory as any).outputKey = 'output'
            const chatHistoryClassName = (executor.memory as any).chatHistory.constructor.name
            // Only replace when its In-Memory
            if (chatHistoryClassName && chatHistoryClassName === 'ChatMessageHistory') {
                ;(executor.memory as any).chatHistory = mapChatHistory(options)
            }
        }

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            const result = await executor.call({ input }, [loggerHandler, handler, ...callbacks])
            return result?.output
        } else {
            const result = await executor.call({ input }, [loggerHandler, ...callbacks])
            return result?.output
        }
    }
}

module.exports = { nodeClass: ConversationalRetrievalAgent_Agents }
