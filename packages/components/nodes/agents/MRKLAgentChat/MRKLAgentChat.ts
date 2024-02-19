import { flatten } from 'lodash'
import { AgentExecutor, createReactAgent } from 'langchain/agents'
import { pull } from 'langchain/hub'
import { Tool } from '@langchain/core/tools'
import type { PromptTemplate } from '@langchain/core/prompts'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { additionalCallbacks } from '../../../src/handler'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ChatOpenAI } from "../../chatmodels/ChatOpenAI/FlowiseChatOpenAI";
import { HumanMessage } from "@langchain/core/messages";
import { addImagesToMessages } from "../../../src/multiModalUtils";
import { ChatPromptTemplate, SystemMessagePromptTemplate } from "langchain/prompts";
// import { injectLcAgentExecutorNodeData } from '../../../src/multiModalUtils'

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

    constructor() {
        this.label = 'ReAct Agent for Chat Models'
        this.name = 'mrklAgentChat'
        this.version = 2.0
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
            }
        ]
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const model = nodeData.inputs?.model as BaseChatModel
        let tools = nodeData.inputs?.tools as Tool[]
        tools = flatten(tools)

        const promptWithChat = await pull<PromptTemplate>('hwchase17/react-chat')
        let chatPromptTemplate = undefined
        if (model instanceof ChatOpenAI) {
            const chatModel = model as ChatOpenAI
            const messageContent = addImagesToMessages(nodeData, options, model.multiModalOption)

            if (messageContent?.length) {
                // Change model to gpt-4-vision
                chatModel.modelName = 'gpt-4-vision-preview'

                // Change default max token to higher when using gpt-4-vision
                chatModel.maxTokens = 1024
                const oldTemplate = promptWithChat.template as string
                let chatPromptTemplate = ChatPromptTemplate.fromMessages([SystemMessagePromptTemplate.fromTemplate(oldTemplate)])
                chatPromptTemplate.promptMessages = [new HumanMessage({ content: messageContent })]
            } else {
                // revert to previous values if image upload is empty
                chatModel.modelName = chatModel.configuredModel
                chatModel.maxTokens = chatModel.configuredMaxToken
            }
        }

        const agent = await createReactAgent({
            llm: model,
            tools,
            prompt: chatPromptTemplate ?? promptWithChat
        })

        const executor = new AgentExecutor({
            agent,
            tools,
            verbose: process.env.DEBUG === 'true'
        })
        // injectLcAgentExecutorNodeData(executor, nodeData, options)

        const callbacks = await additionalCallbacks(nodeData, options)

        const result = await executor.invoke({
            input,
            callbacks
        })

        return result?.output
    }
}

module.exports = { nodeClass: MRKLAgentChat_Agents }
