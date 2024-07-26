import { flatten } from 'lodash'
import { BaseMessage } from '@langchain/core/messages'
import { ChainValues } from '@langchain/core/utils/types'
import { AgentStep } from '@langchain/core/agents'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatOpenAI, formatToOpenAIFunction } from '@langchain/openai'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { OpenAIFunctionsAgentOutputParser } from 'langchain/agents/openai/output_parser'
import { FlowiseMemory, ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { AgentExecutor, formatAgentSteps } from '../../../src/agents'
import { checkInputs, Moderation } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

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
    badge?: string
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'Conversational Retrieval Agent'
        this.name = 'conversationalRetrievalAgent'
        this.version = 4.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.badge = 'DEPRECATING'
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
                label: 'OpenAI/Azure Chat Model',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'System Message',
                name: 'systemMessage',
                type: 'string',
                default: defaultMessage,
                rows: 4,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Input Moderation',
                description: 'Detect text that could generate harmful output and prevent it from being sent to the language model',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            },
            {
                label: 'Max Iterations',
                name: 'maxIterations',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        return prepareAgent(nodeData, options, { sessionId: this.sessionId, chatId: options.chatId, input })
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the BabyAGI agent
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                //streamResponse(options.socketIO && options.socketIOClientId, e.message, options.socketIO, options.socketIOClientId)
                return formatResponse(e.message)
            }
        }

        const executor = prepareAgent(nodeData, options, { sessionId: this.sessionId, chatId: options.chatId, input })

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        let res: ChainValues = {}

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            res = await executor.invoke({ input }, { callbacks: [loggerHandler, handler, ...callbacks] })
        } else {
            res = await executor.invoke({ input }, { callbacks: [loggerHandler, ...callbacks] })
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

        return res?.output
    }
}

const prepareAgent = (nodeData: INodeData, options: ICommonObject, flowObj: { sessionId?: string; chatId?: string; input?: string }) => {
    const model = nodeData.inputs?.model as ChatOpenAI
    const memory = nodeData.inputs?.memory as FlowiseMemory
    const systemMessage = nodeData.inputs?.systemMessage as string
    const maxIterations = nodeData.inputs?.maxIterations as string
    let tools = nodeData.inputs?.tools
    tools = flatten(tools)
    const memoryKey = memory.memoryKey ? memory.memoryKey : 'chat_history'
    const inputKey = memory.inputKey ? memory.inputKey : 'input'
    const prependMessages = options?.prependMessages

    const prompt = ChatPromptTemplate.fromMessages([
        ['ai', systemMessage ? systemMessage : defaultMessage],
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
                const messages = (await memory.getChatMessages(flowObj?.sessionId, true, prependMessages)) as BaseMessage[]
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
        returnIntermediateSteps: true,
        verbose: process.env.DEBUG === 'true' ? true : false,
        maxIterations: maxIterations ? parseFloat(maxIterations) : undefined
    })

    return executor
}

module.exports = { nodeClass: ConversationalRetrievalAgent_Agents }
