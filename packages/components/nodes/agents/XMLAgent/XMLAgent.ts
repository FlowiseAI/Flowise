import { flatten } from 'lodash'
import { ChainValues } from '@langchain/core/utils/types'
import { AgentStep } from '@langchain/core/agents'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { RunnableSequence } from '@langchain/core/runnables'
import { Tool } from '@langchain/core/tools'
import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { formatLogToMessage } from 'langchain/agents/format_scratchpad/log_to_message'
import { getBaseClasses } from '../../../src/utils'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { AgentExecutor, XMLAgentOutputParser } from '../../../src/agents'
import { Moderation, checkInputs } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

const defaultSystemMessage = `You are a helpful assistant. Help the user answer any questions.

You have access to the following tools:

{tools}

In order to use a tool, you can use <tool></tool> and <tool_input></tool_input> tags. You will then get back a response in the form <observation></observation>
For example, if you have a tool called 'search' that could run a google search, in order to search for the weather in SF you would respond:

<tool>search</tool><tool_input>weather in SF</tool_input>
<observation>64 degrees</observation>

When you are done, respond with a final answer between <final_answer></final_answer>. For example:

<final_answer>The weather in SF is 64 degrees</final_answer>

Begin!

Previous Conversation:
{chat_history}

Question: {input}
{agent_scratchpad}`

class XMLAgent_Agents implements INode {
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
        this.label = 'XML Agent'
        this.name = 'xmlAgent'
        this.version = 2.0
        this.type = 'XMLAgent'
        this.category = 'Agents'
        this.icon = 'xmlagent.svg'
        this.description = `Agent that is designed for LLMs that are good for reasoning/writing XML (e.g: Anthropic Claude)`
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
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
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'System Message',
                name: 'systemMessage',
                type: 'string',
                warning: 'Prompt must include input variables: {tools}, {chat_history}, {input} and {agent_scratchpad}',
                rows: 4,
                default: defaultSystemMessage,
                additionalParams: true
            },
            {
                label: 'Input Moderation',
                description: 'Detect text that could generate harmful output and prevent it from being sent to the language model',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(): Promise<any> {
        return null
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
        const executor = await prepareAgent(nodeData, { sessionId: this.sessionId, chatId: options.chatId, input }, options.chatHistory)

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

const prepareAgent = async (
    nodeData: INodeData,
    flowObj: { sessionId?: string; chatId?: string; input?: string },
    chatHistory: IMessage[] = []
) => {
    const model = nodeData.inputs?.model as BaseChatModel
    const memory = nodeData.inputs?.memory as FlowiseMemory
    const systemMessage = nodeData.inputs?.systemMessage as string
    let tools = nodeData.inputs?.tools
    tools = flatten(tools)
    const inputKey = memory.inputKey ? memory.inputKey : 'input'
    const memoryKey = memory.memoryKey ? memory.memoryKey : 'chat_history'

    let promptMessage = systemMessage ? systemMessage : defaultSystemMessage
    if (memory.memoryKey) promptMessage = promptMessage.replaceAll('{chat_history}', `{${memory.memoryKey}}`)
    if (memory.inputKey) promptMessage = promptMessage.replaceAll('{input}', `{${memory.inputKey}}`)

    const prompt = ChatPromptTemplate.fromMessages([
        HumanMessagePromptTemplate.fromTemplate(promptMessage),
        new MessagesPlaceholder('agent_scratchpad')
    ])

    const missingVariables = ['tools', 'agent_scratchpad'].filter((v) => !prompt.inputVariables.includes(v))

    if (missingVariables.length > 0) {
        throw new Error(`Provided prompt is missing required input variables: ${JSON.stringify(missingVariables)}`)
    }

    const llmWithStop = model.bind({ stop: ['</tool_input>', '</final_answer>'] })

    const messages = (await memory.getChatMessages(flowObj.sessionId, false, chatHistory)) as IMessage[]
    let chatHistoryMsgTxt = ''
    for (const message of messages) {
        if (message.type === 'apiMessage') {
            chatHistoryMsgTxt += `\\nAI:${message.message}`
        } else if (message.type === 'userMessage') {
            chatHistoryMsgTxt += `\\nHuman:${message.message}`
        }
    }

    const runnableAgent = RunnableSequence.from([
        {
            [inputKey]: (i: { input: string; tools: Tool[]; steps: AgentStep[] }) => i.input,
            agent_scratchpad: (i: { input: string; tools: Tool[]; steps: AgentStep[] }) => formatLogToMessage(i.steps),
            tools: (_: { input: string; tools: Tool[]; steps: AgentStep[] }) =>
                tools.map((tool: Tool) => `${tool.name}: ${tool.description}`),
            [memoryKey]: (_: { input: string; tools: Tool[]; steps: AgentStep[] }) => chatHistoryMsgTxt
        },
        prompt,
        llmWithStop,
        new XMLAgentOutputParser()
    ])

    const executor = AgentExecutor.fromAgentAndTools({
        agent: runnableAgent,
        tools,
        sessionId: flowObj?.sessionId,
        chatId: flowObj?.chatId,
        input: flowObj?.input,
        isXML: true,
        verbose: process.env.DEBUG === 'true' ? true : false
    })

    return executor
}

module.exports = { nodeClass: XMLAgent_Agents }
