import { AgentExecutorInput, BaseSingleActionAgent, BaseMultiActionAgent, RunnableAgent, StoppingMethod } from 'langchain/agents'
import { ChainValues, AgentStep, AgentFinish, AgentAction, BaseMessage, FunctionMessage, AIMessage } from 'langchain/schema'
import { OutputParserException } from 'langchain/schema/output_parser'
import { CallbackManager, CallbackManagerForChainRun, Callbacks } from 'langchain/callbacks'
import { ToolInputParsingException, Tool } from '@langchain/core/tools'
import { Runnable } from 'langchain/schema/runnable'
import { BaseChain, SerializedLLMChain } from 'langchain/chains'
import { Serializable } from '@langchain/core/load/serializable'

type AgentExecutorOutput = ChainValues

interface AgentExecutorIteratorInput {
    agentExecutor: AgentExecutor
    inputs: Record<string, string>
    callbacks?: Callbacks
    tags?: string[]
    metadata?: Record<string, unknown>
    runName?: string
    runManager?: CallbackManagerForChainRun
}

//TODO: stream tools back
export class AgentExecutorIterator extends Serializable implements AgentExecutorIteratorInput {
    lc_namespace = ['langchain', 'agents', 'executor_iterator']

    agentExecutor: AgentExecutor

    inputs: Record<string, string>

    callbacks: Callbacks

    tags: string[] | undefined

    metadata: Record<string, unknown> | undefined

    runName: string | undefined

    private _finalOutputs: Record<string, unknown> | undefined

    get finalOutputs(): Record<string, unknown> | undefined {
        return this._finalOutputs
    }

    /** Intended to be used as a setter method, needs to be async. */
    async setFinalOutputs(value: Record<string, unknown> | undefined) {
        this._finalOutputs = undefined
        if (value) {
            const preparedOutputs: Record<string, unknown> = await this.agentExecutor.prepOutputs(this.inputs, value, true)
            this._finalOutputs = preparedOutputs
        }
    }

    runManager: CallbackManagerForChainRun | undefined

    intermediateSteps: AgentStep[] = []

    iterations = 0

    get nameToToolMap(): Record<string, Tool> {
        const toolMap = this.agentExecutor.tools.map((tool) => ({
            [tool.name]: tool
        }))
        return Object.assign({}, ...toolMap)
    }

    constructor(fields: AgentExecutorIteratorInput) {
        super(fields)
        this.agentExecutor = fields.agentExecutor
        this.inputs = fields.inputs
        this.tags = fields.tags
        this.metadata = fields.metadata
        this.runName = fields.runName
        this.runManager = fields.runManager
    }

    /**
     * Reset the iterator to its initial state, clearing intermediate steps,
     * iterations, and the final output.
     */
    reset(): void {
        this.intermediateSteps = []
        this.iterations = 0
        this._finalOutputs = undefined
    }

    updateIterations(): void {
        this.iterations += 1
    }

    async *streamIterator() {
        this.reset()

        // Loop to handle iteration
        while (true) {
            try {
                if (this.iterations === 0) {
                    await this.onFirstStep()
                }

                const result = await this._callNext()
                yield result
            } catch (e: any) {
                if ('message' in e && e.message.startsWith('Final outputs already reached: ')) {
                    if (!this.finalOutputs) {
                        throw e
                    }
                    return this.finalOutputs
                }
                if (this.runManager) {
                    await this.runManager.handleChainError(e)
                }
                throw e
            }
        }
    }

    /**
     * Perform any necessary setup for the first step
     * of the asynchronous iterator.
     */
    async onFirstStep(): Promise<void> {
        if (this.iterations === 0) {
            const callbackManager = await CallbackManager.configure(
                this.callbacks,
                this.agentExecutor.callbacks,
                this.tags,
                this.agentExecutor.tags,
                this.metadata,
                this.agentExecutor.metadata,
                {
                    verbose: this.agentExecutor.verbose
                }
            )
            this.runManager = await callbackManager?.handleChainStart(
                this.agentExecutor.toJSON(),
                this.inputs,
                undefined,
                undefined,
                this.tags,
                this.metadata,
                this.runName
            )
        }
    }

    /**
     * Execute the next step in the chain using the
     * AgentExecutor's _takeNextStep method.
     */
    async _executeNextStep(runManager?: CallbackManagerForChainRun): Promise<AgentFinish | AgentStep[]> {
        return this.agentExecutor._takeNextStep(this.nameToToolMap, this.inputs, this.intermediateSteps, runManager)
    }

    /**
     * Process the output of the next step,
     * handling AgentFinish and tool return cases.
     */
    async _processNextStepOutput(
        nextStepOutput: AgentFinish | AgentStep[],
        runManager?: CallbackManagerForChainRun
    ): Promise<Record<string, string | AgentStep[]>> {
        if ('returnValues' in nextStepOutput) {
            const output = await this.agentExecutor._return(nextStepOutput as AgentFinish, this.intermediateSteps, runManager)
            if (this.runManager) {
                await this.runManager.handleChainEnd(output)
            }
            await this.setFinalOutputs(output)
            return output
        }

        this.intermediateSteps = this.intermediateSteps.concat(nextStepOutput as AgentStep[])

        let output: Record<string, string | AgentStep[]> = {}
        if (Array.isArray(nextStepOutput) && nextStepOutput.length === 1) {
            const nextStep = nextStepOutput[0]
            const toolReturn = await this.agentExecutor._getToolReturn(nextStep)
            if (toolReturn) {
                output = await this.agentExecutor._return(toolReturn, this.intermediateSteps, runManager)
                if (this.runManager) {
                    await this.runManager.handleChainEnd(output)
                }
                await this.setFinalOutputs(output)
            }
        }
        output = { intermediateSteps: nextStepOutput as AgentStep[] }
        return output
    }

    async _stop(): Promise<Record<string, unknown>> {
        const output = await this.agentExecutor.agent.returnStoppedResponse(
            this.agentExecutor.earlyStoppingMethod,
            this.intermediateSteps,
            this.inputs
        )
        const returnedOutput = await this.agentExecutor._return(output, this.intermediateSteps, this.runManager)
        await this.setFinalOutputs(returnedOutput)
        return returnedOutput
    }

    async _callNext(): Promise<Record<string, unknown>> {
        // final output already reached: stopiteration (final output)
        if (this.finalOutputs) {
            throw new Error(`Final outputs already reached: ${JSON.stringify(this.finalOutputs, null, 2)}`)
        }
        // timeout/max iterations: stopiteration (stopped response)
        if (!this.agentExecutor.shouldContinueGetter(this.iterations)) {
            return this._stop()
        }
        const nextStepOutput = await this._executeNextStep(this.runManager)
        const output = await this._processNextStepOutput(nextStepOutput, this.runManager)
        this.updateIterations()
        return output
    }
}

export class AgentExecutor extends BaseChain<ChainValues, AgentExecutorOutput> {
    static lc_name() {
        return 'AgentExecutor'
    }

    get lc_namespace() {
        return ['langchain', 'agents', 'executor']
    }

    agent: BaseSingleActionAgent | BaseMultiActionAgent

    tools: this['agent']['ToolType'][]

    returnIntermediateSteps = false

    maxIterations?: number = 15

    earlyStoppingMethod: StoppingMethod = 'force'

    sessionId?: string

    chatId?: string

    input?: string

    /**
     * How to handle errors raised by the agent's output parser.
        Defaults to `False`, which raises the error.

        If `true`, the error will be sent back to the LLM as an observation.
        If a string, the string itself will be sent to the LLM as an observation.
        If a callable function, the function will be called with the exception
        as an argument, and the result of that function will be passed to the agent
        as an observation.
    */
    handleParsingErrors: boolean | string | ((e: OutputParserException | ToolInputParsingException) => string) = false

    get inputKeys() {
        return this.agent.inputKeys
    }

    get outputKeys() {
        return this.agent.returnValues
    }

    constructor(input: AgentExecutorInput & { sessionId?: string; chatId?: string; input?: string }) {
        let agent: BaseSingleActionAgent | BaseMultiActionAgent
        if (Runnable.isRunnable(input.agent)) {
            agent = new RunnableAgent({ runnable: input.agent })
        } else {
            agent = input.agent
        }

        super(input)
        this.agent = agent
        this.tools = input.tools
        this.handleParsingErrors = input.handleParsingErrors ?? this.handleParsingErrors
        /* Getting rid of this because RunnableAgent doesnt allow return direct
        if (this.agent._agentActionType() === "multi") {
            for (const tool of this.tools) {
              if (tool.returnDirect) {
                throw new Error(
                  `Tool with return direct ${tool.name} not supported for multi-action agent.`
                );
              }
            }
        }*/
        this.returnIntermediateSteps = input.returnIntermediateSteps ?? this.returnIntermediateSteps
        this.maxIterations = input.maxIterations ?? this.maxIterations
        this.earlyStoppingMethod = input.earlyStoppingMethod ?? this.earlyStoppingMethod
        this.sessionId = input.sessionId
        this.chatId = input.chatId
        this.input = input.input
    }

    static fromAgentAndTools(fields: AgentExecutorInput & { sessionId?: string; chatId?: string; input?: string }): AgentExecutor {
        const newInstance = new AgentExecutor(fields)
        if (fields.sessionId) newInstance.sessionId = fields.sessionId
        if (fields.chatId) newInstance.chatId = fields.chatId
        if (fields.input) newInstance.input = fields.input
        return newInstance
    }

    get shouldContinueGetter() {
        return this.shouldContinue.bind(this)
    }

    /**
     * Method that checks if the agent execution should continue based on the
     * number of iterations.
     * @param iterations The current number of iterations.
     * @returns A boolean indicating whether the agent execution should continue.
     */
    private shouldContinue(iterations: number): boolean {
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

        while (this.shouldContinue(iterations)) {
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
                        /* Here we need to override Tool call method to include sessionId, chatId, input as parameter
                         * Tool Call Parameters:
                         * - arg: z.output<T>
                         * - configArg?: RunnableConfig | Callbacks
                         * - tags?: string[]
                         * - flowConfig?: { sessionId?: string, chatId?: string, input?: string }
                         */
                        observation = tool
                            ? // @ts-ignore
                              await tool.call(action.toolInput, runManager?.getChild(), undefined, {
                                  sessionId: this.sessionId,
                                  chatId: this.chatId,
                                  input: this.input
                              })
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
                    /* Here we need to override Tool call method to include sessionId, chatId, input as parameter
                     * Tool Call Parameters:
                     * - arg: z.output<T>
                     * - configArg?: RunnableConfig | Callbacks
                     * - tags?: string[]
                     * - flowConfig?: { sessionId?: string, chatId?: string, input?: string }
                     */
                    // @ts-ignore
                    observation = await tool.call(agentAction.toolInput, runManager?.getChild(), undefined, {
                        sessionId: this.sessionId,
                        chatId: this.chatId,
                        input: this.input
                    })
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

    async _return(
        output: AgentFinish,
        intermediateSteps: AgentStep[],
        runManager?: CallbackManagerForChainRun
    ): Promise<AgentExecutorOutput> {
        if (runManager) {
            await runManager.handleAgentEnd(output)
        }
        const finalOutput: Record<string, unknown> = output.returnValues
        if (this.returnIntermediateSteps) {
            finalOutput.intermediateSteps = intermediateSteps
        }
        return finalOutput
    }

    async _getToolReturn(nextStepOutput: AgentStep): Promise<AgentFinish | null> {
        const { action, observation } = nextStepOutput
        const nameToolMap = Object.fromEntries(this.tools.map((t) => [t.name.toLowerCase(), t]))
        const [returnValueKey = 'output'] = this.agent.returnValues
        // Invalid tools won't be in the map, so we return False.
        if (action.tool in nameToolMap) {
            if (nameToolMap[action.tool].returnDirect) {
                return {
                    returnValues: { [returnValueKey]: observation },
                    log: ''
                }
            }
        }
        return null
    }

    _returnStoppedResponse(earlyStoppingMethod: StoppingMethod) {
        if (earlyStoppingMethod === 'force') {
            return {
                returnValues: {
                    output: 'Agent stopped due to iteration limit or time limit.'
                },
                log: ''
            } as AgentFinish
        }
        throw new Error(`Got unsupported early_stopping_method: ${earlyStoppingMethod}`)
    }

    async *_streamIterator(inputs: Record<string, any>): AsyncGenerator<ChainValues> {
        const agentExecutorIterator = new AgentExecutorIterator({
            inputs,
            agentExecutor: this,
            metadata: this.metadata,
            tags: this.tags,
            callbacks: this.callbacks
        })
        const iterator = agentExecutorIterator.streamIterator()
        for await (const step of iterator) {
            if (!step) {
                continue
            }
            yield step
        }
    }

    _chainType() {
        return 'agent_executor' as const
    }

    serialize(): SerializedLLMChain {
        throw new Error('Cannot serialize an AgentExecutor')
    }
}

class ExceptionTool extends Tool {
    name = '_Exception'

    description = 'Exception tool'

    async _call(query: string) {
        return query
    }
}

export const formatAgentSteps = (steps: AgentStep[]): BaseMessage[] =>
    steps.flatMap(({ action, observation }) => {
        const create_function_message = (observation: string, action: AgentAction) => {
            let content: string
            if (typeof observation !== 'string') {
                content = JSON.stringify(observation)
            } else {
                content = observation
            }
            return new FunctionMessage(content, action.tool)
        }
        if ('messageLog' in action && action.messageLog !== undefined) {
            const log = action.messageLog as BaseMessage[]
            return log.concat(create_function_message(observation, action))
        } else {
            return [new AIMessage(action.log)]
        }
    })
