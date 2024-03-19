import { flatten } from 'lodash'
import { Tool, StructuredTool } from '@langchain/core/tools'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { VectorStoreRetriever } from '@langchain/core/vectorstores'
import { PromptTemplate } from '@langchain/core/prompts'
import { AutoGPT } from 'langchain/experimental/autogpt'
import { LLMChain } from 'langchain/chains'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { checkInputs, Moderation } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

type ObjectTool = StructuredTool
const FINISH_NAME = 'finish'

class AutoGPT_Agents implements INode {
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
        this.label = 'AutoGPT'
        this.name = 'autoGPT'
        this.version = 2.0
        this.type = 'AutoGPT'
        this.category = 'Agents'
        this.icon = 'autogpt.svg'
        this.description = 'Autonomous agent with chain of thoughts for self-guided task completion'
        this.baseClasses = ['AutoGPT']
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
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            },
            {
                label: 'AutoGPT Name',
                name: 'aiName',
                type: 'string',
                placeholder: 'Tom',
                optional: true
            },
            {
                label: 'AutoGPT Role',
                name: 'aiRole',
                type: 'string',
                placeholder: 'Assistant',
                optional: true
            },
            {
                label: 'Maximum Loop',
                name: 'maxLoop',
                type: 'number',
                default: 5,
                optional: true
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
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseChatModel
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as VectorStoreRetriever
        let tools = nodeData.inputs?.tools as Tool[]
        tools = flatten(tools)
        const aiName = (nodeData.inputs?.aiName as string) || 'AutoGPT'
        const aiRole = (nodeData.inputs?.aiRole as string) || 'Assistant'
        const maxLoop = nodeData.inputs?.maxLoop as string

        const autogpt = AutoGPT.fromLLMAndTools(model, tools, {
            memory: vectorStoreRetriever,
            aiName,
            aiRole
        })

        autogpt.maxIterations = parseInt(maxLoop, 10)

        return autogpt
    }

    async run(nodeData: INodeData, input: string): Promise<string | object> {
        const executor = nodeData.instance as AutoGPT
        const model = nodeData.inputs?.model as BaseChatModel
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the AutoGPT agent
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                //streamResponse(options.socketIO && options.socketIOClientId, e.message, options.socketIO, options.socketIOClientId)
                return formatResponse(e.message)
            }
        }

        try {
            let totalAssistantReply = ''
            executor.run = async (goals: string[]): Promise<string | undefined> => {
                const user_input = 'Determine which next command to use, and respond using the format specified above:'
                let loopCount = 0
                while (loopCount < executor.maxIterations) {
                    loopCount += 1

                    const { text: assistantReply } = await executor.chain.call({
                        goals,
                        user_input,
                        memory: executor.memory,
                        messages: executor.fullMessageHistory
                    })

                    // eslint-disable-next-line no-console
                    console.log('\x1b[92m\x1b[1m\n*****AutoGPT*****\n\x1b[0m\x1b[0m')
                    // eslint-disable-next-line no-console
                    console.log(assistantReply)
                    totalAssistantReply += assistantReply + '\n'
                    executor.fullMessageHistory.push(new HumanMessage(user_input))
                    executor.fullMessageHistory.push(new AIMessage(assistantReply))

                    const action = await executor.outputParser.parse(assistantReply)
                    const tools = executor.tools.reduce((acc, tool) => ({ ...acc, [tool.name]: tool }), {} as { [key: string]: ObjectTool })
                    if (action.name === FINISH_NAME) {
                        return action.args.response
                    }
                    let result: string
                    if (action.name in tools) {
                        const tool = tools[action.name]
                        let observation
                        try {
                            observation = await tool.call(action.args)
                        } catch (e) {
                            observation = `Error in args: ${e}`
                        }
                        result = `Command ${tool.name} returned: ${observation}`
                    } else if (action.name === 'ERROR') {
                        result = `Error: ${action.args}. `
                    } else {
                        result = `Unknown command '${action.name}'. Please refer to the 'COMMANDS' list for available commands and only respond in the specified JSON format.`
                    }

                    let memoryToAdd = `Assistant Reply: ${assistantReply}\nResult: ${result} `
                    if (executor.feedbackTool) {
                        const feedback = `\n${await executor.feedbackTool.call('Input: ')}`
                        if (feedback === 'q' || feedback === 'stop') {
                            return 'EXITING'
                        }
                        memoryToAdd += feedback
                    }

                    const documents = await executor.textSplitter.createDocuments([memoryToAdd])
                    await executor.memory.addDocuments(documents)
                    executor.fullMessageHistory.push(new SystemMessage(result))
                }

                return undefined
            }

            const res = await executor.run([input])

            if (!res) {
                const sentence = `Unfortunately I was not able to complete all the task. Here is the chain of thoughts:`
                return `${await rephraseString(sentence, model)}\n\`\`\`javascript\n${totalAssistantReply}\n\`\`\`\n`
            }

            const sentence = `I have completed all my tasks. Here is the chain of thoughts:`
            let writeFilePath = ''
            const writeTool = executor.tools.find((tool) => tool.name === 'write_file')
            if (executor.tools.length && writeTool) {
                writeFilePath = (writeTool as any).store.basePath
            }
            return `${await rephraseString(
                sentence,
                model
            )}\n\`\`\`javascript\n${totalAssistantReply}\n\`\`\`\nAnd the final result:\n\`\`\`javascript\n${res}\n\`\`\`\n${
                writeFilePath
                    ? await rephraseString(
                          `You can download the final result displayed above, or see if a new file has been successfully written to \`${writeFilePath}\``,
                          model
                      )
                    : ''
            }`
        } catch (e) {
            throw new Error(e)
        }
    }
}

const rephraseString = async (sentence: string, model: BaseChatModel) => {
    const promptTemplate = new PromptTemplate({
        template: 'You are a helpful Assistant that rephrase a sentence: {sentence}',
        inputVariables: ['sentence']
    })
    const chain = new LLMChain({ llm: model, prompt: promptTemplate })
    const res = await chain.call({ sentence })
    return res?.text
}

module.exports = { nodeClass: AutoGPT_Agents }
