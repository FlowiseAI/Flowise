import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { initializeAgentExecutorWithOptions, AgentExecutor } from 'langchain/agents'
import { Tool } from 'langchain/tools'
import { CustomChainHandler, getBaseClasses } from '../../../src/utils'
import { BaseLanguageModel } from 'langchain/base_language'
import { flatten } from 'lodash'

class OpenAIFunctionAgent_Agents implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAI Function Agent'
        this.name = 'openAIFunctionAgent'
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'openai.png'
        this.description = `An agent that uses OpenAI's Function Calling functionality to pick the tool and args to call`
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'Allowed Tools',
                name: 'tools',
                type: 'Tool',
                list: true
            },
            {
                label: 'OpenAI Chat Model',
                name: 'model',
                description:
                    'Only works with gpt-3.5-turbo-0613 and gpt-4-0613. Refer <a target="_blank" href="https://platform.openai.com/docs/guides/gpt/function-calling">docs</a> for more info',
                type: 'BaseChatModel'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        let tools = nodeData.inputs?.tools as Tool[]
        tools = flatten(tools)

        const executor = await initializeAgentExecutorWithOptions(tools, model, {
            agentType: 'openai-functions',
            verbose: process.env.DEBUG === 'true' ? true : false
        })
        return executor
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const executor = nodeData.instance as AgentExecutor

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            const result = await executor.run(input, [handler])
            return result
        } else {
            const result = await executor.run(input)
            return result
        }
    }
}

module.exports = { nodeClass: OpenAIFunctionAgent_Agents }
