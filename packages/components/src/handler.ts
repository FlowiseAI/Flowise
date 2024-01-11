import { BaseTracer, Run, BaseCallbackHandler } from 'langchain/callbacks'
import { AgentAction, ChainValues } from 'langchain/schema'
import { Logger } from 'winston'
import { Server } from 'socket.io'
import { Client } from 'langsmith'
import { LangChainTracer } from 'langchain/callbacks'
import { LLMonitorHandler } from 'langchain/callbacks/handlers/llmonitor'
import { getCredentialData, getCredentialParam } from './utils'
import { ICommonObject, INodeData } from './Interface'
import CallbackHandler from 'langfuse-langchain'
import { RunTree, RunTreeConfig, Client as LangsmithClient } from 'langsmith'
import { Langfuse, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse'
import monitor from 'llmonitor'
import { v4 as uuidv4 } from 'uuid'

interface AgentRun extends Run {
    actions: AgentAction[]
}

function tryJsonStringify(obj: unknown, fallback: string) {
    try {
        return JSON.stringify(obj, null, 2)
    } catch (err) {
        return fallback
    }
}

function elapsed(run: Run): string {
    if (!run.end_time) return ''
    const elapsed = run.end_time - run.start_time
    if (elapsed < 1000) {
        return `${elapsed}ms`
    }
    return `${(elapsed / 1000).toFixed(2)}s`
}

export class ConsoleCallbackHandler extends BaseTracer {
    name = 'console_callback_handler' as const
    logger: Logger

    protected persistRun(_run: Run) {
        return Promise.resolve()
    }

    constructor(logger: Logger) {
        super()
        this.logger = logger
    }

    // utility methods

    getParents(run: Run) {
        const parents: Run[] = []
        let currentRun = run
        while (currentRun.parent_run_id) {
            const parent = this.runMap.get(currentRun.parent_run_id)
            if (parent) {
                parents.push(parent)
                currentRun = parent
            } else {
                break
            }
        }
        return parents
    }

    getBreadcrumbs(run: Run) {
        const parents = this.getParents(run).reverse()
        const string = [...parents, run]
            .map((parent) => {
                const name = `${parent.execution_order}:${parent.run_type}:${parent.name}`
                return name
            })
            .join(' > ')
        return string
    }

    // logging methods

    onChainStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[chain/start] [${crumbs}] Entering Chain run with input: ${tryJsonStringify(run.inputs, '[inputs]')}`)
    }

    onChainEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[chain/end] [${crumbs}] [${elapsed(run)}] Exiting Chain run with output: ${tryJsonStringify(run.outputs, '[outputs]')}`
        )
    }

    onChainError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[chain/error] [${crumbs}] [${elapsed(run)}] Chain run errored with error: ${tryJsonStringify(run.error, '[error]')}`
        )
    }

    onLLMStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        const inputs = 'prompts' in run.inputs ? { prompts: (run.inputs.prompts as string[]).map((p) => p.trim()) } : run.inputs
        this.logger.verbose(`[llm/start] [${crumbs}] Entering LLM run with input: ${tryJsonStringify(inputs, '[inputs]')}`)
    }

    onLLMEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[llm/end] [${crumbs}] [${elapsed(run)}] Exiting LLM run with output: ${tryJsonStringify(run.outputs, '[response]')}`
        )
    }

    onLLMError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[llm/error] [${crumbs}] [${elapsed(run)}] LLM run errored with error: ${tryJsonStringify(run.error, '[error]')}`
        )
    }

    onToolStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[tool/start] [${crumbs}] Entering Tool run with input: "${run.inputs.input?.trim()}"`)
    }

    onToolEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[tool/end] [${crumbs}] [${elapsed(run)}] Exiting Tool run with output: "${run.outputs?.output?.trim()}"`)
    }

    onToolError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[tool/error] [${crumbs}] [${elapsed(run)}] Tool run errored with error: ${tryJsonStringify(run.error, '[error]')}`
        )
    }

    onAgentAction(run: Run) {
        const agentRun = run as AgentRun
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[agent/action] [${crumbs}] Agent selected action: ${tryJsonStringify(
                agentRun.actions[agentRun.actions.length - 1],
                '[action]'
            )}`
        )
    }
}

/**
 * Custom chain handler class
 */
export class CustomChainHandler extends BaseCallbackHandler {
    name = 'custom_chain_handler'
    isLLMStarted = false
    socketIO: Server
    socketIOClientId = ''
    skipK = 0 // Skip streaming for first K numbers of handleLLMStart
    returnSourceDocuments = false
    cachedResponse = true

    constructor(socketIO: Server, socketIOClientId: string, skipK?: number, returnSourceDocuments?: boolean) {
        super()
        this.socketIO = socketIO
        this.socketIOClientId = socketIOClientId
        this.skipK = skipK ?? this.skipK
        this.returnSourceDocuments = returnSourceDocuments ?? this.returnSourceDocuments
    }

    handleLLMStart() {
        this.cachedResponse = false
        if (this.skipK > 0) this.skipK -= 1
    }

    handleLLMNewToken(token: string) {
        if (this.skipK === 0) {
            if (!this.isLLMStarted) {
                this.isLLMStarted = true
                this.socketIO.to(this.socketIOClientId).emit('start', token)
            }
            this.socketIO.to(this.socketIOClientId).emit('token', token)
        }
    }

    handleLLMEnd() {
        this.socketIO.to(this.socketIOClientId).emit('end')
    }

    handleChainEnd(outputs: ChainValues, _: string, parentRunId?: string): void | Promise<void> {
        /*
            Langchain does not call handleLLMStart, handleLLMEnd, handleLLMNewToken when the chain is cached.
            Callback Order is "Chain Start -> LLM Start --> LLM Token --> LLM End -> Chain End" for normal responses.
            Callback Order is "Chain Start -> Chain End" for cached responses.
         */
        if (this.cachedResponse && parentRunId === undefined) {
            const cachedValue = outputs.text ?? outputs.response ?? outputs.output ?? outputs.output_text
            //split at whitespace, and keep the whitespace. This is to preserve the original formatting.
            const result = cachedValue.split(/(\s+)/)
            result.forEach((token: string, index: number) => {
                if (index === 0) {
                    this.socketIO.to(this.socketIOClientId).emit('start', token)
                }
                this.socketIO.to(this.socketIOClientId).emit('token', token)
            })
            if (this.returnSourceDocuments) {
                this.socketIO.to(this.socketIOClientId).emit('sourceDocuments', outputs?.sourceDocuments)
            }
            this.socketIO.to(this.socketIOClientId).emit('end')
        } else {
            if (this.returnSourceDocuments) {
                this.socketIO.to(this.socketIOClientId).emit('sourceDocuments', outputs?.sourceDocuments)
            }
        }
    }
}

export const additionalCallbacks = async (nodeData: INodeData, options: ICommonObject) => {
    try {
        if (!options.analytic) return []

        const analytic = JSON.parse(options.analytic)
        const callbacks: any = []

        for (const provider in analytic) {
            const providerStatus = analytic[provider].status as boolean
            if (providerStatus) {
                const credentialId = analytic[provider].credentialId as string
                const credentialData = await getCredentialData(credentialId ?? '', options)
                if (provider === 'langSmith') {
                    const langSmithProject = analytic[provider].projectName as string

                    const langSmithApiKey = getCredentialParam('langSmithApiKey', credentialData, nodeData)
                    const langSmithEndpoint = getCredentialParam('langSmithEndpoint', credentialData, nodeData)

                    const client = new Client({
                        apiUrl: langSmithEndpoint ?? 'https://api.smith.langchain.com',
                        apiKey: langSmithApiKey
                    })

                    const tracer = new LangChainTracer({
                        projectName: langSmithProject ?? 'default',
                        //@ts-ignore
                        client
                    })
                    callbacks.push(tracer)
                } else if (provider === 'langFuse') {
                    const release = analytic[provider].release as string

                    const langFuseSecretKey = getCredentialParam('langFuseSecretKey', credentialData, nodeData)
                    const langFusePublicKey = getCredentialParam('langFusePublicKey', credentialData, nodeData)
                    const langFuseEndpoint = getCredentialParam('langFuseEndpoint', credentialData, nodeData)

                    const langFuseOptions: any = {
                        secretKey: langFuseSecretKey,
                        publicKey: langFusePublicKey,
                        baseUrl: langFuseEndpoint ?? 'https://cloud.langfuse.com'
                    }
                    if (release) langFuseOptions.release = release
                    if (options.chatId) langFuseOptions.userId = options.chatId

                    const handler = new CallbackHandler(langFuseOptions)
                    callbacks.push(handler)
                } else if (provider === 'llmonitor') {
                    const llmonitorAppId = getCredentialParam('llmonitorAppId', credentialData, nodeData)
                    const llmonitorEndpoint = getCredentialParam('llmonitorEndpoint', credentialData, nodeData)

                    const llmonitorFields: ICommonObject = {
                        appId: llmonitorAppId,
                        apiUrl: llmonitorEndpoint ?? 'https://app.llmonitor.com'
                    }

                    const handler = new LLMonitorHandler(llmonitorFields)
                    callbacks.push(handler)
                }
            }
        }
        return callbacks
    } catch (e) {
        throw new Error(e)
    }
}

export class AnalyticHandler {
    nodeData: INodeData
    options: ICommonObject = {}
    handlers: ICommonObject = {}

    constructor(nodeData: INodeData, options: ICommonObject) {
        this.options = options
        this.nodeData = nodeData
        this.init()
    }

    async init() {
        try {
            if (!this.options.analytic) return

            const analytic = JSON.parse(this.options.analytic)

            for (const provider in analytic) {
                const providerStatus = analytic[provider].status as boolean

                if (providerStatus) {
                    const credentialId = analytic[provider].credentialId as string
                    const credentialData = await getCredentialData(credentialId ?? '', this.options)
                    if (provider === 'langSmith') {
                        const langSmithProject = analytic[provider].projectName as string
                        const langSmithApiKey = getCredentialParam('langSmithApiKey', credentialData, this.nodeData)
                        const langSmithEndpoint = getCredentialParam('langSmithEndpoint', credentialData, this.nodeData)

                        const client = new LangsmithClient({
                            apiUrl: langSmithEndpoint ?? 'https://api.smith.langchain.com',
                            apiKey: langSmithApiKey
                        })

                        this.handlers['langSmith'] = { client, langSmithProject }
                    } else if (provider === 'langFuse') {
                        const release = analytic[provider].release as string
                        const langFuseSecretKey = getCredentialParam('langFuseSecretKey', credentialData, this.nodeData)
                        const langFusePublicKey = getCredentialParam('langFusePublicKey', credentialData, this.nodeData)
                        const langFuseEndpoint = getCredentialParam('langFuseEndpoint', credentialData, this.nodeData)

                        const langfuse = new Langfuse({
                            secretKey: langFuseSecretKey,
                            publicKey: langFusePublicKey,
                            baseUrl: langFuseEndpoint ?? 'https://cloud.langfuse.com',
                            release
                        })
                        this.handlers['langFuse'] = { client: langfuse }
                    } else if (provider === 'llmonitor') {
                        const llmonitorAppId = getCredentialParam('llmonitorAppId', credentialData, this.nodeData)
                        const llmonitorEndpoint = getCredentialParam('llmonitorEndpoint', credentialData, this.nodeData)

                        monitor.init({
                            appId: llmonitorAppId,
                            apiUrl: llmonitorEndpoint
                        })

                        this.handlers['llmonitor'] = { client: monitor }
                    }
                }
            }
        } catch (e) {
            throw new Error(e)
        }
    }

    async onChainStart(name: string, input: string, parentIds?: ICommonObject) {
        const returnIds: ICommonObject = {
            langSmith: {},
            langFuse: {},
            llmonitor: {}
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            if (!parentIds || !Object.keys(parentIds).length) {
                const parentRunConfig: RunTreeConfig = {
                    name,
                    run_type: 'chain',
                    inputs: {
                        text: input
                    },
                    serialized: {},
                    project_name: this.handlers['langSmith'].langSmithProject,
                    client: this.handlers['langSmith'].client
                }
                const parentRun = new RunTree(parentRunConfig)
                await parentRun.postRun()
                this.handlers['langSmith'].chainRun = { [parentRun.id]: parentRun }
                returnIds['langSmith'].chainRun = parentRun.id
            } else {
                const parentRun: RunTree | undefined = this.handlers['langSmith'].chainRun[parentIds['langSmith'].chainRun]
                if (parentRun) {
                    const childChainRun = await parentRun.createChild({
                        name,
                        run_type: 'chain',
                        inputs: {
                            text: input
                        }
                    })
                    await childChainRun.postRun()
                    this.handlers['langSmith'].chainRun = { [childChainRun.id]: childChainRun }
                    returnIds['langSmith'].chainRun = childChainRun.id
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            let langfuseTraceClient: LangfuseTraceClient

            if (!parentIds || !Object.keys(parentIds).length) {
                const langfuse: Langfuse = this.handlers['langFuse'].client
                langfuseTraceClient = langfuse.trace({
                    name,
                    userId: this.options.chatId,
                    metadata: { tags: ['openai-assistant'] }
                })
            } else {
                langfuseTraceClient = this.handlers['langFuse'].trace[parentIds['langFuse']]
            }

            if (langfuseTraceClient) {
                const span = langfuseTraceClient.span({
                    name,
                    input: {
                        text: input
                    }
                })
                this.handlers['langFuse'].trace = { [langfuseTraceClient.id]: langfuseTraceClient }
                this.handlers['langFuse'].span = { [span.id]: span }
                returnIds['langFuse'].trace = langfuseTraceClient.id
                returnIds['langFuse'].span = span.id
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'llmonitor')) {
            const monitor = this.handlers['llmonitor'].client

            if (monitor) {
                const runId = uuidv4()
                await monitor.trackEvent('chain', 'start', {
                    runId,
                    name,
                    userId: this.options.chatId,
                    input
                })
                this.handlers['llmonitor'].chainEvent = { [runId]: runId }
                returnIds['llmonitor'].chainEvent = runId
            }
        }

        return returnIds
    }

    async onChainEnd(returnIds: ICommonObject, output: string | object, shutdown = false) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const chainRun: RunTree | undefined = this.handlers['langSmith'].chainRun[returnIds['langSmith'].chainRun]
            if (chainRun) {
                await chainRun.end({
                    outputs: {
                        output
                    }
                })
                await chainRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const span: LangfuseSpanClient | undefined = this.handlers['langFuse'].span[returnIds['langFuse'].span]
            if (span) {
                span.end({
                    output
                })
                if (shutdown) {
                    const langfuse: Langfuse = this.handlers['langFuse'].client
                    await langfuse.shutdownAsync()
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'llmonitor')) {
            const chainEventId = returnIds['llmonitor'].chainEvent
            const monitor = this.handlers['llmonitor'].client

            if (monitor && chainEventId) {
                await monitor.trackEvent('chain', 'end', {
                    runId: chainEventId,
                    output
                })
            }
        }
    }

    async onChainError(returnIds: ICommonObject, error: string | object, shutdown = false) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const chainRun: RunTree | undefined = this.handlers['langSmith'].chainRun[returnIds['langSmith'].chainRun]
            if (chainRun) {
                await chainRun.end({
                    error: {
                        error
                    }
                })
                await chainRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const span: LangfuseSpanClient | undefined = this.handlers['langFuse'].span[returnIds['langFuse'].span]
            if (span) {
                span.end({
                    output: {
                        error
                    }
                })
                if (shutdown) {
                    const langfuse: Langfuse = this.handlers['langFuse'].client
                    await langfuse.shutdownAsync()
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'llmonitor')) {
            const chainEventId = returnIds['llmonitor'].chainEvent
            const monitor = this.handlers['llmonitor'].client

            if (monitor && chainEventId) {
                await monitor.trackEvent('chain', 'end', {
                    runId: chainEventId,
                    output: error
                })
            }
        }
    }

    async onLLMStart(name: string, input: string, parentIds: ICommonObject) {
        const returnIds: ICommonObject = {
            langSmith: {},
            langFuse: {},
            llmonitor: {}
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const parentRun: RunTree | undefined = this.handlers['langSmith'].chainRun[parentIds['langSmith'].chainRun]
            if (parentRun) {
                const childLLMRun = await parentRun.createChild({
                    name,
                    run_type: 'llm',
                    inputs: {
                        prompts: [input]
                    }
                })
                await childLLMRun.postRun()
                this.handlers['langSmith'].llmRun = { [childLLMRun.id]: childLLMRun }
                returnIds['langSmith'].llmRun = childLLMRun.id
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const trace: LangfuseTraceClient | undefined = this.handlers['langFuse'].trace[parentIds['langFuse'].trace]
            if (trace) {
                const generation = trace.generation({
                    name,
                    input: input
                })
                this.handlers['langFuse'].generation = { [generation.id]: generation }
                returnIds['langFuse'].generation = generation.id
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'llmonitor')) {
            const monitor = this.handlers['llmonitor'].client
            const chainEventId: string = this.handlers['llmonitor'].chainEvent[parentIds['llmonitor'].chainEvent]

            if (monitor && chainEventId) {
                const runId = uuidv4()
                await monitor.trackEvent('llm', 'start', {
                    runId,
                    parentRunId: chainEventId,
                    name,
                    userId: this.options.chatId,
                    input
                })
                this.handlers['llmonitor'].llmEvent = { [runId]: runId }
                returnIds['llmonitor'].llmEvent = runId
            }
        }

        return returnIds
    }

    async onLLMEnd(returnIds: ICommonObject, output: string) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const llmRun: RunTree | undefined = this.handlers['langSmith'].llmRun[returnIds['langSmith'].llmRun]
            if (llmRun) {
                await llmRun.end({
                    outputs: {
                        generations: [output]
                    }
                })
                await llmRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const generation: LangfuseGenerationClient | undefined = this.handlers['langFuse'].generation[returnIds['langFuse'].generation]
            if (generation) {
                generation.end({
                    output: output
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'llmonitor')) {
            const llmEventId: string = this.handlers['llmonitor'].llmEvent[returnIds['llmonitor'].llmEvent]
            const monitor = this.handlers['llmonitor'].client

            if (monitor && llmEventId) {
                await monitor.trackEvent('llm', 'end', {
                    runId: llmEventId,
                    output
                })
            }
        }
    }

    async onLLMError(returnIds: ICommonObject, error: string | object) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const llmRun: RunTree | undefined = this.handlers['langSmith'].llmRun[returnIds['langSmith'].llmRun]
            if (llmRun) {
                await llmRun.end({
                    error: {
                        error
                    }
                })
                await llmRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const generation: LangfuseGenerationClient | undefined = this.handlers['langFuse'].generation[returnIds['langFuse'].generation]
            if (generation) {
                generation.end({
                    output: error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'llmonitor')) {
            const llmEventId: string = this.handlers['llmonitor'].llmEvent[returnIds['llmonitor'].llmEvent]
            const monitor = this.handlers['llmonitor'].client

            if (monitor && llmEventId) {
                await monitor.trackEvent('llm', 'end', {
                    runId: llmEventId,
                    output: error
                })
            }
        }
    }

    async onToolStart(name: string, input: string | object, parentIds: ICommonObject) {
        const returnIds: ICommonObject = {
            langSmith: {},
            langFuse: {},
            llmonitor: {}
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const parentRun: RunTree | undefined = this.handlers['langSmith'].chainRun[parentIds['langSmith'].chainRun]
            if (parentRun) {
                const childToolRun = await parentRun.createChild({
                    name,
                    run_type: 'tool',
                    inputs: {
                        input
                    }
                })
                await childToolRun.postRun()
                this.handlers['langSmith'].toolRun = { [childToolRun.id]: childToolRun }
                returnIds['langSmith'].toolRun = childToolRun.id
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const trace: LangfuseTraceClient | undefined = this.handlers['langFuse'].trace[parentIds['langFuse'].trace]
            if (trace) {
                const toolSpan = trace.span({
                    name,
                    input
                })
                this.handlers['langFuse'].toolSpan = { [toolSpan.id]: toolSpan }
                returnIds['langFuse'].toolSpan = toolSpan.id
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'llmonitor')) {
            const monitor = this.handlers['llmonitor'].client
            const chainEventId: string = this.handlers['llmonitor'].chainEvent[parentIds['llmonitor'].chainEvent]

            if (monitor && chainEventId) {
                const runId = uuidv4()
                await monitor.trackEvent('tool', 'start', {
                    runId,
                    parentRunId: chainEventId,
                    name,
                    userId: this.options.chatId,
                    input
                })
                this.handlers['llmonitor'].toolEvent = { [runId]: runId }
                returnIds['llmonitor'].toolEvent = runId
            }
        }

        return returnIds
    }

    async onToolEnd(returnIds: ICommonObject, output: string | object) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const toolRun: RunTree | undefined = this.handlers['langSmith'].toolRun[returnIds['langSmith'].toolRun]
            if (toolRun) {
                await toolRun.end({
                    outputs: {
                        output
                    }
                })
                await toolRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const toolSpan: LangfuseSpanClient | undefined = this.handlers['langFuse'].toolSpan[returnIds['langFuse'].toolSpan]
            if (toolSpan) {
                toolSpan.end({
                    output
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'llmonitor')) {
            const toolEventId: string = this.handlers['llmonitor'].toolEvent[returnIds['llmonitor'].toolEvent]
            const monitor = this.handlers['llmonitor'].client

            if (monitor && toolEventId) {
                await monitor.trackEvent('tool', 'end', {
                    runId: toolEventId,
                    output
                })
            }
        }
    }

    async onToolError(returnIds: ICommonObject, error: string | object) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const toolRun: RunTree | undefined = this.handlers['langSmith'].toolRun[returnIds['langSmith'].toolRun]
            if (toolRun) {
                await toolRun.end({
                    error: {
                        error
                    }
                })
                await toolRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const toolSpan: LangfuseSpanClient | undefined = this.handlers['langFuse'].toolSpan[returnIds['langFuse'].toolSpan]
            if (toolSpan) {
                toolSpan.end({
                    output: error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'llmonitor')) {
            const toolEventId: string = this.handlers['llmonitor'].llmEvent[returnIds['llmonitor'].toolEvent]
            const monitor = this.handlers['llmonitor'].client

            if (monitor && toolEventId) {
                await monitor.trackEvent('tool', 'end', {
                    runId: toolEventId,
                    output: error
                })
            }
        }
    }
}
