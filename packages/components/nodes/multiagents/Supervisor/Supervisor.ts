import { flatten } from 'lodash'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { Runnable, RunnableConfig } from '@langchain/core/runnables'
import { ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate } from '@langchain/core/prompts'
import {
    ICommonObject,
    IMultiAgentNode,
    INode,
    INodeData,
    INodeParams,
    ITeamState,
    IVisionChatModal,
    MessageContentImageUrl
} from '../../../src/Interface'
import { Moderation } from '../../moderation/Moderation'
import { z } from 'zod'
import { StructuredTool } from '@langchain/core/tools'
import { AgentExecutor, JsonOutputToolsParser, ToolCallingAgentOutputParser } from '../../../src/agents'
import { ChatMistralAI } from '@langchain/mistralai'
import { ChatOpenAI } from '../../chatmodels/ChatOpenAI/FlowiseChatOpenAI'
import { ChatAnthropic } from '../../chatmodels/ChatAnthropic/FlowiseChatAnthropic'
import { addImagesToMessages, llmSupportsVision } from '../../../src/multiModalUtils'
import { ChatGoogleGenerativeAI } from '../../chatmodels/ChatGoogleGenerativeAI/FlowiseChatGoogleGenerativeAI'
import { AzureChatOpenAI } from '../../chatmodels/AzureChatOpenAI/FlowiseAzureChatOpenAI'

const sysPrompt = `You are a supervisor tasked with managing a conversation between the following workers: {team_members}.
Given the following user request, respond with the worker to act next.
Each worker will perform a task and respond with their results and status.
When finished, respond with FINISH.
Select strategically to minimize the number of steps taken.`

const routerToolName = 'route'

const defaultSummarization = 'Conversation finished'
const defaultInstruction = 'Conversation finished'

class Supervisor_MultiAgents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs?: INodeParams[]
    badge?: string

    constructor() {
        this.label = 'Supervisor'
        this.name = 'supervisor'
        this.version = 3.0
        this.type = 'Supervisor'
        this.icon = 'supervisor.svg'
        this.category = 'Multi Agents'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Supervisor Name',
                name: 'supervisorName',
                type: 'string',
                placeholder: 'Supervisor',
                default: 'Supervisor'
            },
            {
                label: 'Supervisor Prompt',
                name: 'supervisorPrompt',
                type: 'string',
                description: 'Prompt must contains {team_members}',
                rows: 4,
                default: sysPrompt,
                additionalParams: true
            },
            {
                label: 'Tool Calling Chat Model',
                name: 'model',
                type: 'BaseChatModel',
                description: `Only compatible with models that are capable of function calling: ChatOpenAI, ChatMistral, ChatAnthropic, ChatGoogleGenerativeAI, GroqChat. Best result with GPT-4 model`
            },
            {
                label: 'Agent Memory',
                name: 'agentMemory',
                type: 'BaseCheckpointSaver',
                description: 'Save the state of the agent',
                optional: true
            },
            {
                label: 'Summarization',
                name: 'summarization',
                type: 'boolean',
                description: 'Return final output as a summarization of the conversation',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Recursion Limit',
                name: 'recursionLimit',
                type: 'number',
                description: 'Maximum number of times a call can recurse. If not provided, defaults to 100.',
                default: 100,
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
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const llm = nodeData.inputs?.model as BaseChatModel
        const supervisorPrompt = nodeData.inputs?.supervisorPrompt as string
        const supervisorLabel = nodeData.inputs?.supervisorName as string
        const _recursionLimit = nodeData.inputs?.recursionLimit as string
        const recursionLimit = _recursionLimit ? parseFloat(_recursionLimit) : 100
        const moderations = (nodeData.inputs?.inputModeration as Moderation[]) ?? []
        const summarization = nodeData.inputs?.summarization as string

        const abortControllerSignal = options.signal as AbortController

        const workersNodes: IMultiAgentNode[] =
            nodeData.inputs?.workerNodes && nodeData.inputs?.workerNodes.length ? flatten(nodeData.inputs?.workerNodes) : []
        const workersNodeNames = workersNodes.map((node: IMultiAgentNode) => node.name)

        if (!supervisorLabel) throw new Error('Supervisor name is required!')

        const supervisorName = supervisorLabel.toLowerCase().replace(/\s/g, '_').trim()

        let multiModalMessageContent: MessageContentImageUrl[] = []

        async function createTeamSupervisor(llm: BaseChatModel, systemPrompt: string, members: string[]): Promise<Runnable> {
            const memberOptions = ['FINISH', ...members]

            systemPrompt = systemPrompt.replaceAll('{team_members}', members.join(', '))

            let userPrompt = `Given the conversation above, who should act next? Or should we FINISH? Select one of: ${memberOptions.join(
                ', '
            )}`

            const tool = new RouteTool({
                schema: z.object({
                    reasoning: z.string(),
                    next: z.enum(['FINISH', ...members]),
                    instructions: z.string().describe('The specific instructions of the sub-task the next role should accomplish.')
                })
            })

            let supervisor

            if (llm instanceof ChatMistralAI) {
                let prompt = ChatPromptTemplate.fromMessages([
                    ['system', systemPrompt],
                    new MessagesPlaceholder('messages'),
                    ['human', userPrompt]
                ])

                const messages = await processImageMessage(1, llm, prompt, nodeData, options)
                prompt = messages.prompt
                multiModalMessageContent = messages.multiModalMessageContent

                // Force Mistral to use tool
                // @ts-ignore
                const modelWithTool = llm.bind({
                    tools: [tool],
                    tool_choice: 'any',
                    signal: abortControllerSignal ? abortControllerSignal.signal : undefined
                })

                const outputParser = new JsonOutputToolsParser()

                supervisor = prompt
                    .pipe(modelWithTool)
                    .pipe(outputParser)
                    .pipe((x) => {
                        if (Array.isArray(x) && x.length) {
                            const toolAgentAction = x[0]
                            return {
                                next: Object.keys(toolAgentAction.args).length ? toolAgentAction.args.next : 'FINISH',
                                instructions: Object.keys(toolAgentAction.args).length
                                    ? toolAgentAction.args.instructions
                                    : 'Conversation finished',
                                team_members: members.join(', ')
                            }
                        } else {
                            return {
                                next: 'FINISH',
                                instructions: 'Conversation finished',
                                team_members: members.join(', ')
                            }
                        }
                    })
            } else if (llm instanceof ChatAnthropic) {
                // Force Anthropic to use tool : https://docs.anthropic.com/claude/docs/tool-use#forcing-tool-use
                userPrompt = `Given the conversation above, who should act next? Or should we FINISH? Select one of: ${memberOptions.join(
                    ', '
                )}. Use the ${routerToolName} tool in your response.`

                let prompt = ChatPromptTemplate.fromMessages([
                    ['system', systemPrompt],
                    new MessagesPlaceholder('messages'),
                    ['human', userPrompt]
                ])

                const messages = await processImageMessage(1, llm, prompt, nodeData, options)
                prompt = messages.prompt
                multiModalMessageContent = messages.multiModalMessageContent

                if ((llm as any).bindTools === undefined) {
                    throw new Error(`This agent only compatible with function calling models.`)
                }

                const modelWithTool = (llm as any).bindTools([tool])

                const outputParser = new ToolCallingAgentOutputParser()

                supervisor = prompt
                    .pipe(modelWithTool)
                    .pipe(outputParser)
                    .pipe((x) => {
                        if (Array.isArray(x) && x.length) {
                            const toolAgentAction = x[0] as any
                            return {
                                next: toolAgentAction.toolInput.next,
                                instructions: toolAgentAction.toolInput.instructions,
                                team_members: members.join(', ')
                            }
                        } else if (typeof x === 'object' && 'returnValues' in x) {
                            return {
                                next: 'FINISH',
                                instructions: x.returnValues?.output,
                                team_members: members.join(', ')
                            }
                        } else {
                            return {
                                next: 'FINISH',
                                instructions: 'Conversation finished',
                                team_members: members.join(', ')
                            }
                        }
                    })
            } else if (llm instanceof ChatOpenAI || llm instanceof AzureChatOpenAI) {
                let prompt = ChatPromptTemplate.fromMessages([
                    ['system', systemPrompt],
                    new MessagesPlaceholder('messages'),
                    ['human', userPrompt]
                ])

                // @ts-ignore
                const messages = await processImageMessage(1, llm, prompt, nodeData, options)
                prompt = messages.prompt
                multiModalMessageContent = messages.multiModalMessageContent

                // Force OpenAI to use tool
                const modelWithTool = llm.bind({
                    tools: [tool],
                    tool_choice: { type: 'function', function: { name: routerToolName } },
                    signal: abortControllerSignal ? abortControllerSignal.signal : undefined
                })

                const outputParser = new ToolCallingAgentOutputParser()

                supervisor = prompt
                    .pipe(modelWithTool)
                    .pipe(outputParser)
                    .pipe((x) => {
                        if (Array.isArray(x) && x.length) {
                            const toolAgentAction = x[0] as any
                            return {
                                next: toolAgentAction.toolInput.next,
                                instructions: toolAgentAction.toolInput.instructions,
                                team_members: members.join(', ')
                            }
                        } else if (typeof x === 'object' && 'returnValues' in x) {
                            return {
                                next: 'FINISH',
                                instructions: x.returnValues?.output,
                                team_members: members.join(', ')
                            }
                        } else {
                            return {
                                next: 'FINISH',
                                instructions: 'Conversation finished',
                                team_members: members.join(', ')
                            }
                        }
                    })
            } else if (llm instanceof ChatGoogleGenerativeAI) {
                /*
                 * Gemini doesn't have system message and messages have to be alternate between model and user
                 * So we have to place the system + human prompt at last
                 */
                let prompt = ChatPromptTemplate.fromMessages([
                    ['system', systemPrompt],
                    new MessagesPlaceholder('messages'),
                    ['human', userPrompt]
                ])

                const messages = await processImageMessage(2, llm, prompt, nodeData, options)
                prompt = messages.prompt
                multiModalMessageContent = messages.multiModalMessageContent

                if (llm.bindTools === undefined) {
                    throw new Error(`This agent only compatible with function calling models.`)
                }
                const modelWithTool = llm.bindTools([tool])

                const outputParser = new ToolCallingAgentOutputParser()

                supervisor = prompt
                    .pipe(modelWithTool)
                    .pipe(outputParser)
                    .pipe((x) => {
                        if (Array.isArray(x) && x.length) {
                            const toolAgentAction = x[0] as any
                            return {
                                next: toolAgentAction.toolInput.next,
                                instructions: toolAgentAction.toolInput.instructions,
                                team_members: members.join(', ')
                            }
                        } else if (typeof x === 'object' && 'returnValues' in x) {
                            return {
                                next: 'FINISH',
                                instructions: x.returnValues?.output,
                                team_members: members.join(', ')
                            }
                        } else {
                            return {
                                next: 'FINISH',
                                instructions: 'Conversation finished',
                                team_members: members.join(', ')
                            }
                        }
                    })
            } else {
                let prompt = ChatPromptTemplate.fromMessages([
                    ['system', systemPrompt],
                    new MessagesPlaceholder('messages'),
                    ['human', userPrompt]
                ])

                const messages = await processImageMessage(1, llm, prompt, nodeData, options)
                prompt = messages.prompt
                multiModalMessageContent = messages.multiModalMessageContent

                if (llm.bindTools === undefined) {
                    throw new Error(`This agent only compatible with function calling models.`)
                }
                const modelWithTool = llm.bindTools([tool])

                const outputParser = new ToolCallingAgentOutputParser()

                supervisor = prompt
                    .pipe(modelWithTool)
                    .pipe(outputParser)
                    .pipe((x) => {
                        if (Array.isArray(x) && x.length) {
                            const toolAgentAction = x[0] as any
                            return {
                                next: toolAgentAction.toolInput.next,
                                instructions: toolAgentAction.toolInput.instructions,
                                team_members: members.join(', ')
                            }
                        } else if (typeof x === 'object' && 'returnValues' in x) {
                            return {
                                next: 'FINISH',
                                instructions: x.returnValues?.output,
                                team_members: members.join(', ')
                            }
                        } else {
                            return {
                                next: 'FINISH',
                                instructions: 'Conversation finished',
                                team_members: members.join(', ')
                            }
                        }
                    })
            }

            return supervisor
        }

        async function createTeamSupervisorWithSummarize(llm: BaseChatModel, systemPrompt: string, members: string[]): Promise<Runnable> {
            const memberOptions = ['FINISH', ...members]

            systemPrompt = systemPrompt.replaceAll('{team_members}', members.join(', '))

            let userPrompt = `Given the conversation above, who should act next? Or should we FINISH? Select one of: ${memberOptions.join(
                ', '
            )}
            Remember to give reasonings, instructions and summarization`

            const tool = new RouteTool({
                schema: z.object({
                    reasoning: z.string(),
                    next: z.enum(['FINISH', ...members]),
                    instructions: z.string().describe('The specific instructions of the sub-task the next role should accomplish.'),
                    summarization: z.string().optional().describe('Summarization of the conversation')
                })
            })

            let supervisor

            if (llm instanceof ChatMistralAI) {
                let prompt = ChatPromptTemplate.fromMessages([
                    ['system', systemPrompt],
                    new MessagesPlaceholder('messages'),
                    ['human', userPrompt]
                ])

                const messages = await processImageMessage(1, llm, prompt, nodeData, options)
                prompt = messages.prompt
                multiModalMessageContent = messages.multiModalMessageContent

                // Force Mistral to use tool
                // @ts-ignore
                const modelWithTool = llm.bind({
                    tools: [tool],
                    tool_choice: 'any',
                    signal: abortControllerSignal ? abortControllerSignal.signal : undefined
                })

                const outputParser = new JsonOutputToolsParser()

                supervisor = prompt
                    .pipe(modelWithTool)
                    .pipe(outputParser)
                    .pipe((x) => {
                        if (Array.isArray(x) && x.length) {
                            const toolAgentAction = x[0]
                            return {
                                next: Object.keys(toolAgentAction.args).length ? toolAgentAction.args.next : 'FINISH',
                                instructions: Object.keys(toolAgentAction.args).length
                                    ? toolAgentAction.args.instructions
                                    : defaultInstruction,
                                team_members: members.join(', '),
                                summarization: Object.keys(toolAgentAction.args).length ? toolAgentAction.args.summarization : ''
                            }
                        } else {
                            return {
                                next: 'FINISH',
                                instructions: defaultInstruction,
                                team_members: members.join(', '),
                                summarization: defaultSummarization
                            }
                        }
                    })
            } else if (llm instanceof ChatAnthropic) {
                // Force Anthropic to use tool : https://docs.anthropic.com/claude/docs/tool-use#forcing-tool-use
                userPrompt = `Given the conversation above, who should act next? Or should we FINISH? Select one of: ${memberOptions.join(
                    ', '
                )}. Remember to give reasonings, instructions and summarization. Use the ${routerToolName} tool in your response.`

                let prompt = ChatPromptTemplate.fromMessages([
                    ['system', systemPrompt],
                    new MessagesPlaceholder('messages'),
                    ['human', userPrompt]
                ])

                const messages = await processImageMessage(1, llm, prompt, nodeData, options)
                prompt = messages.prompt
                multiModalMessageContent = messages.multiModalMessageContent

                if ((llm as any).bindTools === undefined) {
                    throw new Error(`This agent only compatible with function calling models.`)
                }

                const modelWithTool = (llm as any).bindTools([tool])

                const outputParser = new ToolCallingAgentOutputParser()

                supervisor = prompt
                    .pipe(modelWithTool)
                    .pipe(outputParser)
                    .pipe((x) => {
                        if (Array.isArray(x) && x.length) {
                            const toolAgentAction = x[0] as any
                            return {
                                next: toolAgentAction.toolInput.next,
                                instructions: toolAgentAction.toolInput.instructions,
                                team_members: members.join(', '),
                                summarization: toolAgentAction.toolInput.summarization
                            }
                        } else if (typeof x === 'object' && 'returnValues' in x) {
                            return {
                                next: 'FINISH',
                                instructions: x.returnValues?.output,
                                team_members: members.join(', '),
                                summarization: defaultSummarization
                            }
                        } else {
                            return {
                                next: 'FINISH',
                                instructions: defaultInstruction,
                                team_members: members.join(', '),
                                summarization: defaultSummarization
                            }
                        }
                    })
            } else if (llm instanceof ChatOpenAI) {
                let prompt = ChatPromptTemplate.fromMessages([
                    ['system', systemPrompt],
                    new MessagesPlaceholder('messages'),
                    ['human', userPrompt]
                ])

                // @ts-ignore
                const messages = await processImageMessage(1, llm, prompt, nodeData, options)
                prompt = messages.prompt
                multiModalMessageContent = messages.multiModalMessageContent

                // Force OpenAI to use tool
                const modelWithTool = llm.bind({
                    tools: [tool],
                    tool_choice: { type: 'function', function: { name: routerToolName } },
                    signal: abortControllerSignal ? abortControllerSignal.signal : undefined
                })

                const outputParser = new ToolCallingAgentOutputParser()

                supervisor = prompt
                    .pipe(modelWithTool)
                    .pipe(outputParser)
                    .pipe((x) => {
                        if (Array.isArray(x) && x.length) {
                            const toolAgentAction = x[0] as any
                            return {
                                next: toolAgentAction.toolInput.next,
                                instructions: toolAgentAction.toolInput.instructions,
                                team_members: members.join(', '),
                                summarization: toolAgentAction.toolInput.summarization
                            }
                        } else if (typeof x === 'object' && 'returnValues' in x) {
                            return {
                                next: 'FINISH',
                                instructions: x.returnValues?.output,
                                team_members: members.join(', '),
                                summarization: defaultSummarization
                            }
                        } else {
                            return {
                                next: 'FINISH',
                                instructions: defaultInstruction,
                                team_members: members.join(', '),
                                summarization: defaultSummarization
                            }
                        }
                    })
            } else if (llm instanceof ChatGoogleGenerativeAI) {
                /*
                 * Gemini doesn't have system message and messages have to be alternate between model and user
                 * So we have to place the system + human prompt at last
                 */
                let prompt = ChatPromptTemplate.fromMessages([
                    ['system', systemPrompt],
                    new MessagesPlaceholder('messages'),
                    ['human', userPrompt]
                ])

                const messages = await processImageMessage(2, llm, prompt, nodeData, options)
                prompt = messages.prompt
                multiModalMessageContent = messages.multiModalMessageContent

                if (llm.bindTools === undefined) {
                    throw new Error(`This agent only compatible with function calling models.`)
                }
                const modelWithTool = llm.bindTools([tool])

                const outputParser = new ToolCallingAgentOutputParser()

                supervisor = prompt
                    .pipe(modelWithTool)
                    .pipe(outputParser)
                    .pipe((x) => {
                        if (Array.isArray(x) && x.length) {
                            const toolAgentAction = x[0] as any
                            return {
                                next: toolAgentAction.toolInput.next,
                                instructions: toolAgentAction.toolInput.instructions,
                                team_members: members.join(', '),
                                summarization: toolAgentAction.toolInput.summarization
                            }
                        } else if (typeof x === 'object' && 'returnValues' in x) {
                            return {
                                next: 'FINISH',
                                instructions: x.returnValues?.output,
                                team_members: members.join(', '),
                                summarization: defaultSummarization
                            }
                        } else {
                            return {
                                next: 'FINISH',
                                instructions: defaultInstruction,
                                team_members: members.join(', '),
                                summarization: defaultSummarization
                            }
                        }
                    })
            } else {
                let prompt = ChatPromptTemplate.fromMessages([
                    ['system', systemPrompt],
                    new MessagesPlaceholder('messages'),
                    ['human', userPrompt]
                ])

                const messages = await processImageMessage(1, llm, prompt, nodeData, options)
                prompt = messages.prompt
                multiModalMessageContent = messages.multiModalMessageContent

                if (llm.bindTools === undefined) {
                    throw new Error(`This agent only compatible with function calling models.`)
                }
                const modelWithTool = llm.bindTools([tool])

                const outputParser = new ToolCallingAgentOutputParser()

                supervisor = prompt
                    .pipe(modelWithTool)
                    .pipe(outputParser)
                    .pipe((x) => {
                        if (Array.isArray(x) && x.length) {
                            const toolAgentAction = x[0] as any
                            return {
                                next: toolAgentAction.toolInput.next,
                                instructions: toolAgentAction.toolInput.instructions,
                                team_members: members.join(', '),
                                summarization: toolAgentAction.toolInput.summarization
                            }
                        } else if (typeof x === 'object' && 'returnValues' in x) {
                            return {
                                next: 'FINISH',
                                instructions: x.returnValues?.output,
                                team_members: members.join(', '),
                                summarization: defaultSummarization
                            }
                        } else {
                            return {
                                next: 'FINISH',
                                instructions: defaultInstruction,
                                team_members: members.join(', '),
                                summarization: defaultSummarization
                            }
                        }
                    })
            }

            return supervisor
        }

        const supervisorAgent = summarization
            ? await createTeamSupervisorWithSummarize(llm, supervisorPrompt ? supervisorPrompt : sysPrompt, workersNodeNames)
            : await createTeamSupervisor(llm, supervisorPrompt ? supervisorPrompt : sysPrompt, workersNodeNames)

        const supervisorNode = async (state: ITeamState, config: RunnableConfig) =>
            await agentNode(
                {
                    state,
                    agent: supervisorAgent,
                    nodeId: nodeData.id,
                    abortControllerSignal
                },
                config
            )

        const returnOutput: IMultiAgentNode = {
            node: supervisorNode,
            name: supervisorName ?? 'supervisor',
            label: supervisorLabel ?? 'Supervisor',
            type: 'supervisor',
            workers: workersNodeNames,
            recursionLimit,
            llm,
            moderations,
            multiModalMessageContent,
            checkpointMemory: nodeData.inputs?.agentMemory
        }

        return returnOutput
    }
}

async function agentNode(
    {
        state,
        agent,
        nodeId,
        abortControllerSignal
    }: { state: ITeamState; agent: AgentExecutor | Runnable; nodeId: string; abortControllerSignal: AbortController },
    config: RunnableConfig
) {
    try {
        if (abortControllerSignal.signal.aborted) {
            throw new Error('Aborted!')
        }
        const result = await agent.invoke({ ...state, signal: abortControllerSignal.signal }, config)
        const additional_kwargs: ICommonObject = { nodeId, type: 'supervisor' }
        result.additional_kwargs = { ...result.additional_kwargs, ...additional_kwargs }
        return result
    } catch (error) {
        throw new Error('Aborted!')
    }
}

const processImageMessage = async (
    index: number,
    llm: BaseChatModel,
    prompt: ChatPromptTemplate,
    nodeData: INodeData,
    options: ICommonObject
) => {
    let multiModalMessageContent: MessageContentImageUrl[] = []

    if (llmSupportsVision(llm)) {
        const visionChatModel = llm as IVisionChatModal
        multiModalMessageContent = await addImagesToMessages(nodeData, options, llm.multiModalOption)

        if (multiModalMessageContent?.length) {
            visionChatModel.setVisionModel()

            const msg = HumanMessagePromptTemplate.fromTemplate([...multiModalMessageContent])

            prompt.promptMessages.splice(index, 0, msg)
        } else {
            visionChatModel.revertToOriginalModel()
        }
    }

    return { prompt, multiModalMessageContent }
}

class RouteTool extends StructuredTool {
    name = routerToolName

    description = 'Select the worker to act next'

    schema

    constructor(fields: ICommonObject) {
        super()
        this.schema = fields.schema
    }

    async _call(input: any) {
        return JSON.stringify(input)
    }
}

module.exports = { nodeClass: Supervisor_MultiAgents }
