import { flatten } from 'lodash'
import { BaseMessage } from '@langchain/core/messages'
import { ChainValues } from '@langchain/core/utils/types'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { convertToOpenAITool } from '@langchain/core/utils/function_calling'
import { formatToOpenAIToolMessages } from 'langchain/agents/format_scratchpad/openai_tools'
import { OpenAIToolsAgentOutputParser, type ToolsAgentStep } from 'langchain/agents/openai/output_parser'
import { getBaseClasses } from '../../../src/utils'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams, IUsedTool } from '../../../src/Interface'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { AgentExecutor } from '../../../src/agents'
import { Moderation, checkInputs } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'
import type { Document } from '@langchain/core/documents'
import { BaseRetriever } from '@langchain/core/retrievers'
import { RESPONSE_TEMPLATE } from '../../chains/ConversationalRetrievalQAChain/prompts'

class OpenAIConversationalRetrievalAgent_Agents implements INode {
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
    badge?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'Open AI ConversationalRetrieval Agent'
        this.name = 'openAIConversationalRetrievalAgent'
        this.version = 1.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'function.svg'
        this.description = `Agent that uses OpenAI Function Calling to pick the tools and args to call`
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.badge = 'NEW'
        this.inputs = [
            {
                label: 'Tools',
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
                description: 'Taking the rephrased question, search for answer from the provided context',
                warning: 'Prompt must include input variable: {context}',
                rows: 4,
                additionalParams: true,
                optional: true,
                default: RESPONSE_TEMPLATE
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
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        return prepareAgent(nodeData, { sessionId: this.sessionId, chatId: options.chatId, input }, options.chatHistory)
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the OpenAI Function Agent
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                //streamResponse(options.socketIO && options.socketIOClientId, e.message, options.socketIO, options.socketIOClientId)
                return formatResponse(e.message)
            }
        }

        const executor = prepareAgent(nodeData, { sessionId: this.sessionId, chatId: options.chatId, input }, options.chatHistory)

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        let res: ChainValues = {}
        let sourceDocuments: ICommonObject[] = []
        let usedTools: IUsedTool[] = []

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            res = await executor.invoke({ input }, { callbacks: [loggerHandler, handler, ...callbacks] })
            if (res.sourceDocuments) {
                options.socketIO.to(options.socketIOClientId).emit('sourceDocuments', flatten(res.sourceDocuments))
                sourceDocuments = res.sourceDocuments
            }
            if (res.usedTools) {
                options.socketIO.to(options.socketIOClientId).emit('usedTools', res.usedTools)
                usedTools = res.usedTools
            }
        } else {
            res = await executor.invoke({ input }, { callbacks: [loggerHandler, ...callbacks] })
            if (res.sourceDocuments) {
                sourceDocuments = res.sourceDocuments
            }
            if (res.usedTools) {
                usedTools = res.usedTools
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

        let finalRes = res?.output

        if (sourceDocuments.length || usedTools.length) {
            finalRes = { text: res?.output }
            if (sourceDocuments.length) {
                finalRes.sourceDocuments = flatten(sourceDocuments)
            }
            if (usedTools.length) {
                finalRes.usedTools = usedTools
            }
            return finalRes
        }

        return finalRes
    }
}

const formatDocs = (docs: Document[]) => {
    return docs.map((doc, i) => `<doc id='${i}'>${doc.pageContent}</doc>`).join('\n')
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
    const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as BaseRetriever

    const prompt = ChatPromptTemplate.fromMessages([
        ['system', systemMessage ? systemMessage : `You are a helpful AI assistant.`],
        new MessagesPlaceholder(memoryKey),
        ['human', `{${inputKey}}`],
        new MessagesPlaceholder('agent_scratchpad')
    ])

    const modelWithTools = model.bind({ tools: tools.map(convertToOpenAITool) })

    const runnableAgent = RunnableSequence.from([
        {
            [inputKey]: (i: { input: string; steps: ToolsAgentStep[] }) => i.input,
            agent_scratchpad: (i: { input: string; steps: ToolsAgentStep[] }) => formatToOpenAIToolMessages(i.steps),
            [memoryKey]: async (_: { input: string; steps: ToolsAgentStep[] }) => {
                const messages = (await memory.getChatMessages(flowObj?.sessionId, true, chatHistory)) as BaseMessage[]
                return messages ?? []
            },
            context: async (i: { input: string; chatHistory?: string }) => {
                const relevantDocs = await vectorStoreRetriever.invoke(i.input)
                const formattedDocs = formatDocs(relevantDocs)
                return formattedDocs
            }
        },
        prompt,
        modelWithTools,
        new OpenAIToolsAgentOutputParser()
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

module.exports = { nodeClass: OpenAIConversationalRetrievalAgent_Agents }
