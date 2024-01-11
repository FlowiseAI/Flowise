import { FlowiseMemory, ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { AgentExecutor as LCAgentExecutor, AgentExecutorInput } from 'langchain/agents'
import { ChainValues, AgentStep, AgentFinish, AgentAction, BaseMessage, FunctionMessage, AIMessage } from 'langchain/schema'
import { OutputParserException } from 'langchain/schema/output_parser'
import { CallbackManagerForChainRun } from 'langchain/callbacks'
import { formatToOpenAIFunction } from 'langchain/tools'
import { ToolInputParsingException, Tool } from '@langchain/core/tools'
import { getBaseClasses } from '../../../src/utils'
import { flatten } from 'lodash'
import { RunnableSequence } from 'langchain/schema/runnable'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { ChatPromptTemplate, MessagesPlaceholder } from 'langchain/prompts'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { OpenAIFunctionsAgentOutputParser } from 'langchain/agents/openai/output_parser'

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

    constructor(fields: { sessionId?: string }) {
        this.label = 'OpenAI Function Agent'
        this.name = 'openAIFunctionAgent'
        this.version = 3.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'function.svg'
        this.description = `An agent that uses Function Calling to pick the tool and args to call`
        this.baseClasses = [this.type, ...getBaseClasses(LCAgentExecutor)]
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

    async init(nodeData: INodeData): Promise<any> {
        const memory = nodeData.inputs?.memory as FlowiseMemory

        const executor = prepareAgent(nodeData, this.sessionId)
        if (memory) executor.memory = memory

        return executor
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const memory = nodeData.inputs?.memory as FlowiseMemory

        const executor = prepareAgent(nodeData, this.sessionId)

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

const formatAgentSteps = (steps: AgentStep[]): BaseMessage[] =>
    steps.flatMap(({ action, observation }) => {
        if ('messageLog' in action && action.messageLog !== undefined) {
            const log = action.messageLog as BaseMessage[]
            return log.concat(new FunctionMessage(observation, action.tool))
        } else {
            return [new AIMessage(action.log)]
        }
    })

const prepareAgent = (nodeData: INodeData, sessionId?: string) => {
    const model = nodeData.inputs?.model as ChatOpenAI
    const memory = nodeData.inputs?.memory as FlowiseMemory
    const systemMessage = nodeData.inputs?.systemMessage as string
    let tools = nodeData.inputs?.tools
    tools = flatten(tools)
    const memoryKey = memory.memoryKey ? memory.memoryKey : 'chat_history'
    const inputKey = memory.inputKey ? memory.inputKey : 'input'

    const prompt = ChatPromptTemplate.fromMessages([
        ['ai', systemMessage ? systemMessage : `You are a helpful AI assistant.`],
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
                const messages = (await memory.getChatMessages(sessionId, true)) as BaseMessage[]
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
        sessionId
    })

    return executor
}

type AgentExecutorOutput = ChainValues

class AgentExecutor extends LCAgentExecutor {
    sessionId?: string

    static fromAgentAndTools(fields: AgentExecutorInput & { sessionId?: string }): AgentExecutor {
        const newInstance = new AgentExecutor(fields)
        if (fields.sessionId) newInstance.sessionId = fields.sessionId
        return newInstance
    }

    shouldContinueIteration(iterations: number): boolean {
        return this.maxIterations === undefined || iterations < this.maxIterations
    }

    async _call(inputs: ChainValues, runManager?: CallbackManagerForChainRun): Promise<AgentExecutorOutput> {
        const toolsByName = Object.fromEntries(this.tools.map((t) => [t.name.toLowerCase(), t]))

        const steps: AgentStep[] = []
        let iterations = 0

        const getOutput = async (finishStep: AgentFinish): Promise<AgentExecutorOutput> => {
            const { returnValues } = finishStep
            const additional = await this.agent.prepareForOutput(returnValues, steps)

            if (this.returnIntermediateSteps) {
                return { ...returnValues, intermediateSteps: steps, ...additional }
            }
            await runManager?.handleAgentEnd(finishStep)
            return { ...returnValues, ...additional }
        }

        while (this.shouldContinueIteration(iterations)) {
            let output
            try {
                output = await this.agent.plan(steps, inputs, runManager?.getChild())
            } catch (e) {
                if (e instanceof OutputParserException) {
                    let observation
                    let text = e.message
                    if (this.handleParsingErrors === true) {
                        if (e.sendToLLM) {
                            observation = e.observation
                            text = e.llmOutput ?? ''
                        } else {
                            observation = 'Invalid or incomplete response'
                        }
                    } else if (typeof this.handleParsingErrors === 'string') {
                        observation = this.handleParsingErrors
                    } else if (typeof this.handleParsingErrors === 'function') {
                        observation = this.handleParsingErrors(e)
                    } else {
                        throw e
                    }
                    output = {
                        tool: '_Exception',
                        toolInput: observation,
                        log: text
                    } as AgentAction
                } else {
                    throw e
                }
            }
            // Check if the agent has finished
            if ('returnValues' in output) {
                return getOutput(output)
            }

            let actions: AgentAction[]
            if (Array.isArray(output)) {
                actions = output as AgentAction[]
            } else {
                actions = [output as AgentAction]
            }

            const newSteps = await Promise.all(
                actions.map(async (action) => {
                    await runManager?.handleAgentAction(action)
                    const tool = action.tool === '_Exception' ? new ExceptionTool() : toolsByName[action.tool?.toLowerCase()]
                    let observation
                    try {
                        // here we need to override Tool call method to include sessionId as parameter
                        observation = tool
                            ? // @ts-ignore
                              await tool.call(action.toolInput, runManager?.getChild(), undefined, this.sessionId)
                            : `${action.tool} is not a valid tool, try another one.`
                    } catch (e) {
                        if (e instanceof ToolInputParsingException) {
                            if (this.handleParsingErrors === true) {
                                observation = 'Invalid or incomplete tool input. Please try again.'
                            } else if (typeof this.handleParsingErrors === 'string') {
                                observation = this.handleParsingErrors
                            } else if (typeof this.handleParsingErrors === 'function') {
                                observation = this.handleParsingErrors(e)
                            } else {
                                throw e
                            }
                            observation = await new ExceptionTool().call(observation, runManager?.getChild())
                            return { action, observation: observation ?? '' }
                        }
                    }
                    return { action, observation: observation ?? '' }
                })
            )

            steps.push(...newSteps)

            const lastStep = steps[steps.length - 1]
            const lastTool = toolsByName[lastStep.action.tool?.toLowerCase()]

            if (lastTool?.returnDirect) {
                return getOutput({
                    returnValues: { [this.agent.returnValues[0]]: lastStep.observation },
                    log: ''
                })
            }

            iterations += 1
        }

        const finish = await this.agent.returnStoppedResponse(this.earlyStoppingMethod, steps, inputs)

        return getOutput(finish)
    }

    async _takeNextStep(
        nameToolMap: Record<string, Tool>,
        inputs: ChainValues,
        intermediateSteps: AgentStep[],
        runManager?: CallbackManagerForChainRun
    ): Promise<AgentFinish | AgentStep[]> {
        let output
        try {
            output = await this.agent.plan(intermediateSteps, inputs, runManager?.getChild())
        } catch (e) {
            if (e instanceof OutputParserException) {
                let observation
                let text = e.message
                if (this.handleParsingErrors === true) {
                    if (e.sendToLLM) {
                        observation = e.observation
                        text = e.llmOutput ?? ''
                    } else {
                        observation = 'Invalid or incomplete response'
                    }
                } else if (typeof this.handleParsingErrors === 'string') {
                    observation = this.handleParsingErrors
                } else if (typeof this.handleParsingErrors === 'function') {
                    observation = this.handleParsingErrors(e)
                } else {
                    throw e
                }
                output = {
                    tool: '_Exception',
                    toolInput: observation,
                    log: text
                } as AgentAction
            } else {
                throw e
            }
        }

        if ('returnValues' in output) {
            return output
        }

        let actions: AgentAction[]
        if (Array.isArray(output)) {
            actions = output as AgentAction[]
        } else {
            actions = [output as AgentAction]
        }

        const result: AgentStep[] = []
        for (const agentAction of actions) {
            let observation = ''
            if (runManager) {
                await runManager?.handleAgentAction(agentAction)
            }
            if (agentAction.tool in nameToolMap) {
                const tool = nameToolMap[agentAction.tool]
                try {
                    // here we need to override Tool call method to include sessionId as parameter
                    // @ts-ignore
                    observation = await tool.call(agentAction.toolInput, runManager?.getChild(), undefined, this.sessionId)
                } catch (e) {
                    if (e instanceof ToolInputParsingException) {
                        if (this.handleParsingErrors === true) {
                            observation = 'Invalid or incomplete tool input. Please try again.'
                        } else if (typeof this.handleParsingErrors === 'string') {
                            observation = this.handleParsingErrors
                        } else if (typeof this.handleParsingErrors === 'function') {
                            observation = this.handleParsingErrors(e)
                        } else {
                            throw e
                        }
                        observation = await new ExceptionTool().call(observation, runManager?.getChild())
                    }
                }
            } else {
                observation = `${agentAction.tool} is not a valid tool, try another available tool: ${Object.keys(nameToolMap).join(', ')}`
            }
            result.push({
                action: agentAction,
                observation
            })
        }
        return result
    }
}

class ExceptionTool extends Tool {
    name = '_Exception'

    description = 'Exception tool'

    async _call(query: string) {
        return query
    }
}

module.exports = { nodeClass: OpenAIFunctionAgent_Agents }
