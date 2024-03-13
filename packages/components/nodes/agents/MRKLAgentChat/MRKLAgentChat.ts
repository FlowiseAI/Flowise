import { flatten } from 'lodash'
import { AgentExecutor } from 'langchain/agents'
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts'
import { Tool } from '@langchain/core/tools'
import type { PromptTemplate } from '@langchain/core/prompts'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { pull } from 'langchain/hub'
import { additionalCallbacks } from '../../../src/handler'
import { IVisionChatModal, FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { createReactAgent } from '../../../src/agents'
import { addImagesToMessages, llmSupportsVision } from '../../../src/multiModalUtils'
import { checkInputs, Moderation } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

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
        this.version = 4.0
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

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const model = nodeData.inputs?.model as BaseChatModel
        let tools = nodeData.inputs?.tools as Tool[]
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the ReAct Agent for Chat Models
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                //streamResponse(options.socketIO && options.socketIOClientId, e.message, options.socketIO, options.socketIOClientId)
                return formatResponse(e.message)
            }
        }
        tools = flatten(tools)

        const prompt = await pull<PromptTemplate>('hwchase17/react-chat')
        let chatPromptTemplate = undefined

        if (llmSupportsVision(model)) {
            const visionChatModel = model as IVisionChatModal
            const messageContent = addImagesToMessages(nodeData, options, model.multiModalOption)

            if (messageContent?.length) {
                // Change model to vision supported
                visionChatModel.setVisionModel()
                const oldTemplate = prompt.template as string

                const msg = HumanMessagePromptTemplate.fromTemplate([
                    ...messageContent,
                    {
                        text: oldTemplate
                    }
                ])
                msg.inputVariables = prompt.inputVariables
                chatPromptTemplate = ChatPromptTemplate.fromMessages([msg])
            } else {
                // revert to previous values if image upload is empty
                visionChatModel.revertToOriginalModel()
            }
        }

        const agent = await createReactAgent({
            llm: model,
            tools,
            prompt: chatPromptTemplate ?? prompt
        })

        const executor = new AgentExecutor({
            agent,
            tools,
            verbose: process.env.DEBUG === 'true'
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
