import { ChainValues, AgentStep, BaseMessage } from 'langchain/schema'
import { getBaseClasses } from '../../../src/utils'
import { flatten } from 'lodash'
import { RunnableSequence } from 'langchain/schema/runnable'
import { formatToOpenAIFunction } from 'langchain/tools'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { ChatPromptTemplate, MessagesPlaceholder } from 'langchain/prompts'
import { OpenAIFunctionsAgentOutputParser } from 'langchain/agents/openai/output_parser'
import { AgentExecutor, formatAgentSteps } from '../../../src/agents'

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
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'OpenAI Function Agent'
        this.name = 'openAIFunctionAgent'
        this.version = 3.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'function.svg'
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
        this.sessionId = fields?.sessionId
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        return prepareAgent(nodeData, { sessionId: this.sessionId, chatId: options.chatId, input }, options.chatHistory)
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const executor = prepareAgent(nodeData, { sessionId: this.sessionId, chatId: options.chatId, input }, options.chatHistory)

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        let res: ChainValues = {}
        let sourceDocuments: ICommonObject[] = []

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            res = await executor.invoke({ input }, { callbacks: [loggerHandler, handler, ...callbacks] })
            if (res.sourceDocuments) {
                options.socketIO.to(options.socketIOClientId).emit('sourceDocuments', flatten(res.sourceDocuments))
                sourceDocuments = res.sourceDocuments
            }
        } else {
            res = await executor.invoke({ input }, { callbacks: [loggerHandler, ...callbacks] })
            if (res.sourceDocuments) {
                sourceDocuments = res.sourceDocuments
            }
        }

        await memory.addChatMessages(
            [
                {
                    text: input,
                    type: 'userMessage'
                },
                {
                    text: res?.output,
                    type: 'apiMessage'
                }
            ],
            this.sessionId
        )

        return sourceDocuments.length ? { text: res?.output, sourceDocuments: flatten(sourceDocuments) } : res?.output
    }
}

const prepareAgent = (
    nodeData: INodeData,
    flowObj: { sessionId?: string; chatId?: string; input?: string },
    chatHistory: IMessage[] = []
) => {
    const model = nodeData.inputs?.model as ChatOpenAI
    const memory = nodeData.inputs?.memory as FlowiseMemory
    const systemMessage = nodeData.inputs?.systemMessage as string
    let tools = nodeData.inputs?.tools
    tools = flatten(tools)
    const memoryKey = memory.memoryKey ? memory.memoryKey : 'chat_history'
    const inputKey = memory.inputKey ? memory.inputKey : 'input'

    const prompt = ChatPromptTemplate.fromMessages([
        ['system', systemMessage ? systemMessage : `You are a helpful AI assistant.`],
        new MessagesPlaceholder(memoryKey),
        ['human', `{${inputKey}}`],
        new MessagesPlaceholder('agent_scratchpad')
    ])

    const modelWithFunctions = model.bind({
        functions: [...tools.map((tool: any) => formatToOpenAIFunction(tool))]
    })

    const runnableAgent = RunnableSequence.from([
        {
            [inputKey]: (i: { input: string; steps: AgentStep[] }) => i.input,
            agent_scratchpad: (i: { input: string; steps: AgentStep[] }) => formatAgentSteps(i.steps),
            [memoryKey]: async (_: { input: string; steps: AgentStep[] }) => {
                const messages = (await memory.getChatMessages(flowObj?.sessionId, true, chatHistory)) as BaseMessage[]
                return messages ?? []
            }
        },
        prompt,
        modelWithFunctions,
        new OpenAIFunctionsAgentOutputParser()
    ])

    const executor = AgentExecutor.fromAgentAndTools({
        agent: runnableAgent,
        tools,
        sessionId: flowObj?.sessionId,
        chatId: flowObj?.chatId,
        input: flowObj?.input,
        verbose: process.env.DEBUG === 'true' ? true : false
    })

    return executor
}

module.exports = { nodeClass: OpenAIFunctionAgent_Agents }
