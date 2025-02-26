import { Logger } from 'winston'
import { v4 as uuidv4 } from 'uuid'
import { Client } from 'langsmith'
import CallbackHandler from 'langfuse-langchain'
import lunary from 'lunary'
import { RunTree, RunTreeConfig, Client as LangsmithClient } from 'langsmith'
import { Langfuse, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse'
import { LangChainInstrumentation } from '@arizeai/openinference-instrumentation-langchain'
import { Metadata } from '@grpc/grpc-js'
import opentelemetry, { Span, SpanStatusCode } from '@opentelemetry/api'
import { OTLPTraceExporter as GrpcOTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { OTLPTraceExporter as ProtoOTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { Resource } from '@opentelemetry/resources'
import { SimpleSpanProcessor, Tracer } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

import { BaseCallbackHandler, NewTokenIndices, HandleLLMNewTokenCallbackFields } from '@langchain/core/callbacks/base'
import * as CallbackManagerModule from '@langchain/core/callbacks/manager'
import { LangChainTracer, LangChainTracerFields } from '@langchain/core/tracers/tracer_langchain'
import { BaseTracer, Run } from '@langchain/core/tracers/base'
import { ChainValues } from '@langchain/core/utils/types'
import { AgentAction } from '@langchain/core/agents'
import { LunaryHandler } from '@langchain/community/callbacks/handlers/lunary'

import { getCredentialData, getCredentialParam, getEnvironmentVariable } from './utils'
import { ICommonObject, IDatabaseEntity, INodeData, IServerSideEventStreamer } from './Interface'
import { LangWatch, LangWatchSpan, LangWatchTrace, autoconvertTypedValues } from 'langwatch'
import { DataSource } from 'typeorm'
import { ChatGenerationChunk } from '@langchain/core/outputs'
import { AIMessageChunk } from '@langchain/core/messages'

interface AgentRun extends Run {
    actions: AgentAction[]
}

interface ArizeTracerOptions {
    apiKey: string
    spaceId: string
    baseUrl: string
    projectName: string
    sdkIntegration?: string
    sessionId?: string
    enableCallback?: boolean
}

function getArizeTracer(options: ArizeTracerOptions): Tracer | undefined {
    const SEMRESATTRS_PROJECT_NAME = 'openinference.project.name'
    try {
        const metadata = new Metadata()
        metadata.set('api_key', options.apiKey)
        metadata.set('space_id', options.spaceId)
        const traceExporter = new GrpcOTLPTraceExporter({
            url: `${options.baseUrl}/v1`,
            metadata
        })
        const tracerProvider = new NodeTracerProvider({
            resource: new Resource({
                [ATTR_SERVICE_NAME]: options.projectName,
                [ATTR_SERVICE_VERSION]: '1.0.0',
                [SEMRESATTRS_PROJECT_NAME]: options.projectName,
                model_id: options.projectName
            })
        })
        tracerProvider.addSpanProcessor(new SimpleSpanProcessor(traceExporter))
        if (options.enableCallback) {
            registerInstrumentations({
                instrumentations: []
            })
            const lcInstrumentation = new LangChainInstrumentation()
            lcInstrumentation.manuallyInstrument(CallbackManagerModule)
            tracerProvider.register()
        }
        return tracerProvider.getTracer(`arize-tracer-${uuidv4().toString()}`)
    } catch (err) {
        if (process.env.DEBUG === 'true') console.error(`Error setting up Arize tracer: ${err.message}`)
        return undefined
    }
}

interface PhoenixTracerOptions {
    apiKey: string
    baseUrl: string
    projectName: string
    sdkIntegration?: string
    sessionId?: string
    enableCallback?: boolean
}

function getPhoenixTracer(options: PhoenixTracerOptions): Tracer | undefined {
    const SEMRESATTRS_PROJECT_NAME = 'openinference.project.name'
    try {
        const traceExporter = new ProtoOTLPTraceExporter({
            url: `${options.baseUrl}/v1/traces`,
            headers: {
                api_key: options.apiKey
            }
        })
        const tracerProvider = new NodeTracerProvider({
            resource: new Resource({
                [ATTR_SERVICE_NAME]: options.projectName,
                [ATTR_SERVICE_VERSION]: '1.0.0',
                [SEMRESATTRS_PROJECT_NAME]: options.projectName
            })
        })
        tracerProvider.addSpanProcessor(new SimpleSpanProcessor(traceExporter))
        if (options.enableCallback) {
            registerInstrumentations({
                instrumentations: []
            })
            const lcInstrumentation = new LangChainInstrumentation()
            lcInstrumentation.manuallyInstrument(CallbackManagerModule)
            tracerProvider.register()
        }
        return tracerProvider.getTracer(`phoenix-tracer-${uuidv4().toString()}`)
    } catch (err) {
        if (process.env.DEBUG === 'true') console.error(`Error setting up Phoenix tracer: ${err.message}`)
        return undefined
    }
}

function tryGetJsonSpaces() {
    try {
        return parseInt(getEnvironmentVariable('LOG_JSON_SPACES') ?? '2')
    } catch (err) {
        return 2
    }
}

function tryJsonStringify(obj: unknown, fallback: string) {
    try {
        return JSON.stringify(obj, null, tryGetJsonSpaces())
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
        if (getEnvironmentVariable('DEBUG') === 'true') {
            logger.level = getEnvironmentVariable('LOG_LEVEL') ?? 'info'
        }
    }

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
    skipK = 0 // Skip streaming for first K numbers of handleLLMStart
    returnSourceDocuments = false
    cachedResponse = true
    chatId: string = ''
    sseStreamer: IServerSideEventStreamer | undefined

    constructor(sseStreamer: IServerSideEventStreamer | undefined, chatId: string, skipK?: number, returnSourceDocuments?: boolean) {
        super()
        this.sseStreamer = sseStreamer
        this.chatId = chatId
        this.skipK = skipK ?? this.skipK
        this.returnSourceDocuments = returnSourceDocuments ?? this.returnSourceDocuments
    }

    handleLLMStart() {
        this.cachedResponse = false
        if (this.skipK > 0) this.skipK -= 1
    }

    handleLLMNewToken(
        token: string,
        idx?: NewTokenIndices,
        runId?: string,
        parentRunId?: string,
        tags?: string[],
        fields?: HandleLLMNewTokenCallbackFields
    ): void | Promise<void> {
        if (this.skipK === 0) {
            if (!this.isLLMStarted) {
                this.isLLMStarted = true
                if (this.sseStreamer) {
                    this.sseStreamer.streamStartEvent(this.chatId, token)
                }
            }
            if (this.sseStreamer) {
                if (token) {
                    const chunk = fields?.chunk as ChatGenerationChunk
                    const message = chunk?.message as AIMessageChunk
                    const toolCalls = message?.tool_call_chunks || []

                    // Only stream when token is not empty and not a tool call
                    if (toolCalls.length === 0) {
                        this.sseStreamer.streamTokenEvent(this.chatId, token)
                    }
                }
            }
        }
    }

    handleLLMEnd() {
        if (this.sseStreamer) {
            this.sseStreamer.streamEndEvent(this.chatId)
        }
    }

    handleChainEnd(outputs: ChainValues, _: string, parentRunId?: string): void | Promise<void> {
        /*
            Langchain does not call handleLLMStart, handleLLMEnd, handleLLMNewToken when the chain is cached.
            Callback Order is "Chain Start -> LLM Start --> LLM Token --> LLM End -> Chain End" for normal responses.
            Callback Order is "Chain Start -> Chain End" for cached responses.
         */
        if (this.cachedResponse && parentRunId === undefined) {
            const cachedValue = outputs.text || outputs.response || outputs.output || outputs.output_text
            //split at whitespace, and keep the whitespace. This is to preserve the original formatting.
            const result = cachedValue.split(/(\s+)/)
            result.forEach((token: string, index: number) => {
                if (index === 0) {
                    if (this.sseStreamer) {
                        this.sseStreamer.streamStartEvent(this.chatId, token)
                    }
                }
                if (this.sseStreamer) {
                    this.sseStreamer.streamTokenEvent(this.chatId, token)
                }
            })
            if (this.returnSourceDocuments && this.sseStreamer) {
                this.sseStreamer.streamSourceDocumentsEvent(this.chatId, outputs?.sourceDocuments)
            }
            if (this.sseStreamer) {
                this.sseStreamer.streamEndEvent(this.chatId)
            }
        } else {
            if (this.returnSourceDocuments && this.sseStreamer) {
                this.sseStreamer.streamSourceDocumentsEvent(this.chatId, outputs?.sourceDocuments)
            }
        }
    }
}

class ExtendedLunaryHandler extends LunaryHandler {
    chatId: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    currentRunId: string | null
    thread: any
    apiMessageId: string

    constructor({ flowiseOptions, ...options }: any) {
        super(options)
        this.appDataSource = flowiseOptions.appDataSource
        this.databaseEntities = flowiseOptions.databaseEntities
        this.chatId = flowiseOptions.chatId
        this.apiMessageId = flowiseOptions.apiMessageId
    }

    async initThread() {
        const entity = await this.appDataSource.getRepository(this.databaseEntities['Lead']).findOne({
            where: {
                chatId: this.chatId
            }
        })

        const userId = entity?.email ?? entity?.id

        this.thread = lunary.openThread({
            id: this.chatId,
            userId,
            userProps: userId
                ? {
                      name: entity?.name ?? undefined,
                      email: entity?.email ?? undefined,
                      phone: entity?.phone ?? undefined
                  }
                : undefined
        })
    }

    async handleChainStart(chain: any, inputs: any, runId: string, parentRunId?: string, tags?: string[], metadata?: any): Promise<void> {
        // First chain (no parent run id) is the user message
        if (this.chatId && !parentRunId) {
            if (!this.thread) {
                await this.initThread()
            }

            const messageText = inputs.input || inputs.question

            const messageId = this.thread.trackMessage({
                content: messageText,
                role: 'user'
            })

            // Track top level chain id for knowing when we got the final reply
            this.currentRunId = runId

            // Use the messageId as the parent of the chain for reconciliation
            super.handleChainStart(chain, inputs, runId, messageId, tags, metadata)
        } else {
            super.handleChainStart(chain, inputs, runId, parentRunId, tags, metadata)
        }
    }

    async handleChainEnd(outputs: ChainValues, runId: string): Promise<void> {
        if (this.chatId && runId === this.currentRunId) {
            const answer = outputs.output

            this.thread.trackMessage({
                id: this.apiMessageId,
                content: answer,
                role: 'assistant'
            })

            this.currentRunId = null
        }

        super.handleChainEnd(outputs, runId)
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

                    let langSmithField: LangChainTracerFields = {
                        projectName: langSmithProject ?? 'default',
                        //@ts-ignore
                        client
                    }

                    if (nodeData?.inputs?.analytics?.langSmith) {
                        langSmithField = { ...langSmithField, ...nodeData?.inputs?.analytics?.langSmith }
                    }

                    const tracer = new LangChainTracer(langSmithField)
                    callbacks.push(tracer)
                } else if (provider === 'langFuse') {
                    const release = analytic[provider].release as string

                    const langFuseSecretKey = getCredentialParam('langFuseSecretKey', credentialData, nodeData)
                    const langFusePublicKey = getCredentialParam('langFusePublicKey', credentialData, nodeData)
                    const langFuseEndpoint = getCredentialParam('langFuseEndpoint', credentialData, nodeData)

                    let langFuseOptions: any = {
                        secretKey: langFuseSecretKey,
                        publicKey: langFusePublicKey,
                        baseUrl: langFuseEndpoint ?? 'https://cloud.langfuse.com',
                        sdkIntegration: 'Flowise'
                    }
                    if (release) langFuseOptions.release = release
                    if (options.chatId) langFuseOptions.sessionId = options.chatId

                    if (nodeData?.inputs?.analytics?.langFuse) {
                        langFuseOptions = { ...langFuseOptions, ...nodeData?.inputs?.analytics?.langFuse }
                    }

                    const handler = new CallbackHandler(langFuseOptions)
                    callbacks.push(handler)
                } else if (provider === 'lunary') {
                    const lunaryPublicKey = getCredentialParam('lunaryAppId', credentialData, nodeData)
                    const lunaryEndpoint = getCredentialParam('lunaryEndpoint', credentialData, nodeData)

                    let lunaryFields = {
                        publicKey: lunaryPublicKey,
                        apiUrl: lunaryEndpoint ?? 'https://api.lunary.ai',
                        runtime: 'flowise',
                        flowiseOptions: options
                    }

                    if (nodeData?.inputs?.analytics?.lunary) {
                        lunaryFields = { ...lunaryFields, ...nodeData?.inputs?.analytics?.lunary }
                    }

                    const handler = new ExtendedLunaryHandler(lunaryFields)

                    callbacks.push(handler)
                } else if (provider === 'langWatch') {
                    const langWatchApiKey = getCredentialParam('langWatchApiKey', credentialData, nodeData)
                    const langWatchEndpoint = getCredentialParam('langWatchEndpoint', credentialData, nodeData)

                    const langwatch = new LangWatch({
                        apiKey: langWatchApiKey,
                        endpoint: langWatchEndpoint
                    })

                    const trace = langwatch.getTrace()
                    callbacks.push(trace.getLangChainCallback())
                } else if (provider === 'arize') {
                    const arizeApiKey = getCredentialParam('arizeApiKey', credentialData, nodeData)
                    const arizeSpaceId = getCredentialParam('arizeSpaceId', credentialData, nodeData)
                    const arizeEndpoint = getCredentialParam('arizeEndpoint', credentialData, nodeData)
                    const arizeProject = analytic[provider].projectName as string

                    let arizeOptions: ArizeTracerOptions = {
                        apiKey: arizeApiKey,
                        spaceId: arizeSpaceId,
                        baseUrl: arizeEndpoint ?? 'https://otlp.arize.com',
                        projectName: arizeProject ?? 'default',
                        sdkIntegration: 'Flowise',
                        enableCallback: true
                    }

                    if (options.chatId) arizeOptions.sessionId = options.chatId
                    if (nodeData?.inputs?.analytics?.arize) {
                        arizeOptions = { ...arizeOptions, ...nodeData?.inputs?.analytics?.arize }
                    }

                    const tracer: Tracer | undefined = getArizeTracer(arizeOptions)
                    callbacks.push(tracer)
                } else if (provider === 'phoenix') {
                    const phoenixApiKey = getCredentialParam('phoenixApiKey', credentialData, nodeData)
                    const phoenixEndpoint = getCredentialParam('phoenixEndpoint', credentialData, nodeData)
                    const phoenixProject = analytic[provider].projectName as string

                    let phoenixOptions: PhoenixTracerOptions = {
                        apiKey: phoenixApiKey,
                        baseUrl: phoenixEndpoint ?? 'https://app.phoenix.arize.com',
                        projectName: phoenixProject ?? 'default',
                        sdkIntegration: 'Flowise',
                        enableCallback: true
                    }

                    if (options.chatId) phoenixOptions.sessionId = options.chatId
                    if (nodeData?.inputs?.analytics?.phoenix) {
                        phoenixOptions = { ...phoenixOptions, ...nodeData?.inputs?.analytics?.phoenix }
                    }

                    const tracer: Tracer | undefined = getPhoenixTracer(phoenixOptions)
                    callbacks.push(tracer)
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
                            sdkIntegration: 'Flowise',
                            release
                        })
                        this.handlers['langFuse'] = { client: langfuse }
                    } else if (provider === 'lunary') {
                        const lunaryPublicKey = getCredentialParam('lunaryAppId', credentialData, this.nodeData)
                        const lunaryEndpoint = getCredentialParam('lunaryEndpoint', credentialData, this.nodeData)

                        lunary.init({
                            publicKey: lunaryPublicKey,
                            apiUrl: lunaryEndpoint,
                            runtime: 'flowise'
                        })

                        this.handlers['lunary'] = { client: lunary }
                    } else if (provider === 'langWatch') {
                        const langWatchApiKey = getCredentialParam('langWatchApiKey', credentialData, this.nodeData)
                        const langWatchEndpoint = getCredentialParam('langWatchEndpoint', credentialData, this.nodeData)

                        const langwatch = new LangWatch({
                            apiKey: langWatchApiKey,
                            endpoint: langWatchEndpoint
                        })

                        this.handlers['langWatch'] = { client: langwatch }
                    } else if (provider === 'arize') {
                        const arizeApiKey = getCredentialParam('arizeApiKey', credentialData, this.nodeData)
                        const arizeSpaceId = getCredentialParam('arizeSpaceId', credentialData, this.nodeData)
                        const arizeEndpoint = getCredentialParam('arizeEndpoint', credentialData, this.nodeData)
                        const arizeProject = analytic[provider].projectName as string

                        let arizeOptions: ArizeTracerOptions = {
                            apiKey: arizeApiKey,
                            spaceId: arizeSpaceId,
                            baseUrl: arizeEndpoint ?? 'https://otlp.arize.com',
                            projectName: arizeProject ?? 'default',
                            sdkIntegration: 'Flowise',
                            enableCallback: false
                        }

                        const arize: Tracer | undefined = getArizeTracer(arizeOptions)
                        const rootSpan: Span | undefined = undefined

                        this.handlers['arize'] = { client: arize, arizeProject, rootSpan }
                    } else if (provider === 'phoenix') {
                        const phoenixApiKey = getCredentialParam('phoenixApiKey', credentialData, this.nodeData)
                        const phoenixEndpoint = getCredentialParam('phoenixEndpoint', credentialData, this.nodeData)
                        const phoenixProject = analytic[provider].projectName as string

                        let phoenixOptions: PhoenixTracerOptions = {
                            apiKey: phoenixApiKey,
                            baseUrl: phoenixEndpoint ?? 'https://app.phoenix.arize.com',
                            projectName: phoenixProject ?? 'default',
                            sdkIntegration: 'Flowise',
                            enableCallback: false
                        }

                        const phoenix: Tracer | undefined = getPhoenixTracer(phoenixOptions)
                        const rootSpan: Span | undefined = undefined

                        this.handlers['phoenix'] = { client: phoenix, phoenixProject, rootSpan }
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
            lunary: {},
            langWatch: {},
            arize: {},
            phoenix: {}
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
                    client: this.handlers['langSmith'].client,
                    ...this.nodeData?.inputs?.analytics?.langSmith
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
                    sessionId: this.options.chatId,
                    metadata: { tags: ['openai-assistant'] },
                    ...this.nodeData?.inputs?.analytics?.langFuse
                })
            } else {
                langfuseTraceClient = this.handlers['langFuse'].trace[parentIds['langFuse']]
            }

            if (langfuseTraceClient) {
                langfuseTraceClient.update({
                    input: {
                        text: input
                    }
                })
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

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const monitor = this.handlers['lunary'].client

            if (monitor) {
                const runId = uuidv4()
                await monitor.trackEvent('chain', 'start', {
                    runId,
                    name,
                    input,
                    ...this.nodeData?.inputs?.analytics?.lunary
                })
                this.handlers['lunary'].chainEvent = { [runId]: runId }
                returnIds['lunary'].chainEvent = runId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            let langwatchTrace: LangWatchTrace

            if (!parentIds || !Object.keys(parentIds).length) {
                const langwatch: LangWatch = this.handlers['langWatch'].client
                langwatchTrace = langwatch.getTrace({
                    name,
                    metadata: { tags: ['openai-assistant'], threadId: this.options.chatId },
                    ...this.nodeData?.inputs?.analytics?.langWatch
                })
            } else {
                langwatchTrace = this.handlers['langWatch'].trace[parentIds['langWatch']]
            }

            if (langwatchTrace) {
                const span = langwatchTrace.startSpan({
                    name,
                    type: 'chain',
                    input: autoconvertTypedValues(input)
                })
                this.handlers['langWatch'].trace = { [langwatchTrace.traceId]: langwatchTrace }
                this.handlers['langWatch'].span = { [span.spanId]: span }
                returnIds['langWatch'].trace = langwatchTrace.traceId
                returnIds['langWatch'].span = span.spanId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const tracer: Tracer | undefined = this.handlers['arize'].client
            let rootSpan: Span | undefined = this.handlers['arize'].rootSpan

            if (!parentIds || !Object.keys(parentIds).length) {
                rootSpan = tracer ? tracer.startSpan('Flowise') : undefined
                if (rootSpan) {
                    rootSpan.setAttribute('session.id', this.options.chatId)
                    rootSpan.setAttribute('openinference.span.kind', 'CHAIN')
                    rootSpan.setAttribute('input.value', input)
                    rootSpan.setAttribute('input.mime_type', 'text/plain')
                    rootSpan.setAttribute('output.value', '[Object]')
                    rootSpan.setAttribute('output.mime_type', 'text/plain')
                    rootSpan.setStatus({ code: SpanStatusCode.OK })
                    rootSpan.end()
                }
                this.handlers['arize'].rootSpan = rootSpan
            }

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const chainSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (chainSpan) {
                chainSpan.setAttribute('openinference.span.kind', 'CHAIN')
                chainSpan.setAttribute('input.value', JSON.stringify(input))
                chainSpan.setAttribute('input.mime_type', 'application/json')
            }
            const chainSpanId: any = chainSpan?.spanContext().spanId

            this.handlers['arize'].chainSpan = { [chainSpanId]: chainSpan }
            returnIds['arize'].chainSpan = chainSpanId
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const tracer: Tracer | undefined = this.handlers['phoenix'].client
            let rootSpan: Span | undefined = this.handlers['phoenix'].rootSpan

            if (!parentIds || !Object.keys(parentIds).length) {
                rootSpan = tracer ? tracer.startSpan('Flowise') : undefined
                if (rootSpan) {
                    rootSpan.setAttribute('session.id', this.options.chatId)
                    rootSpan.setAttribute('openinference.span.kind', 'CHAIN')
                    rootSpan.setAttribute('input.value', input)
                    rootSpan.setAttribute('input.mime_type', 'text/plain')
                    rootSpan.setAttribute('output.value', '[Object]')
                    rootSpan.setAttribute('output.mime_type', 'text/plain')
                    rootSpan.setStatus({ code: SpanStatusCode.OK })
                    rootSpan.end()
                }
                this.handlers['phoenix'].rootSpan = rootSpan
            }

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const chainSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (chainSpan) {
                chainSpan.setAttribute('openinference.span.kind', 'CHAIN')
                chainSpan.setAttribute('input.value', JSON.stringify(input))
                chainSpan.setAttribute('input.mime_type', 'application/json')
            }
            const chainSpanId: any = chainSpan?.spanContext().spanId

            this.handlers['phoenix'].chainSpan = { [chainSpanId]: chainSpan }
            returnIds['phoenix'].chainSpan = chainSpanId
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
                const langfuseTraceClient = this.handlers['langFuse'].trace[returnIds['langFuse'].trace]
                if (langfuseTraceClient) {
                    langfuseTraceClient.update({
                        output: {
                            output
                        }
                    })
                }
                if (shutdown) {
                    const langfuse: Langfuse = this.handlers['langFuse'].client
                    await langfuse.shutdownAsync()
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const chainEventId = returnIds['lunary'].chainEvent
            const monitor = this.handlers['lunary'].client

            if (monitor && chainEventId) {
                await monitor.trackEvent('chain', 'end', {
                    runId: chainEventId,
                    output
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    output: autoconvertTypedValues(output)
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const chainSpan: Span | undefined = this.handlers['arize'].chainSpan[returnIds['arize'].chainSpan]
            if (chainSpan) {
                chainSpan.setAttribute('output.value', JSON.stringify(output))
                chainSpan.setAttribute('output.mime_type', 'application/json')
                chainSpan.setStatus({ code: SpanStatusCode.OK })
                chainSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const chainSpan: Span | undefined = this.handlers['phoenix'].chainSpan[returnIds['phoenix'].chainSpan]
            if (chainSpan) {
                chainSpan.setAttribute('output.value', JSON.stringify(output))
                chainSpan.setAttribute('output.mime_type', 'application/json')
                chainSpan.setStatus({ code: SpanStatusCode.OK })
                chainSpan.end()
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
                const langfuseTraceClient = this.handlers['langFuse'].trace[returnIds['langFuse'].trace]
                if (langfuseTraceClient) {
                    langfuseTraceClient.update({
                        output: {
                            error
                        }
                    })
                }
                if (shutdown) {
                    const langfuse: Langfuse = this.handlers['langFuse'].client
                    await langfuse.shutdownAsync()
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const chainEventId = returnIds['lunary'].chainEvent
            const monitor = this.handlers['lunary'].client

            if (monitor && chainEventId) {
                await monitor.trackEvent('chain', 'end', {
                    runId: chainEventId,
                    output: error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const chainSpan: Span | undefined = this.handlers['arize'].chainSpan[returnIds['arize'].chainSpan]
            if (chainSpan) {
                chainSpan.setAttribute('error.value', JSON.stringify(error))
                chainSpan.setAttribute('error.mime_type', 'application/json')
                chainSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                chainSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const chainSpan: Span | undefined = this.handlers['phoenix'].chainSpan[returnIds['phoenix'].chainSpan]
            if (chainSpan) {
                chainSpan.setAttribute('error.value', JSON.stringify(error))
                chainSpan.setAttribute('error.mime_type', 'application/json')
                chainSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                chainSpan.end()
            }
        }
    }

    async onLLMStart(name: string, input: string, parentIds: ICommonObject) {
        const returnIds: ICommonObject = {
            langSmith: {},
            langFuse: {},
            lunary: {},
            langWatch: {},
            arize: {},
            phoenix: {}
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

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const monitor = this.handlers['lunary'].client
            const chainEventId: string = this.handlers['lunary'].chainEvent[parentIds['lunary'].chainEvent]

            if (monitor && chainEventId) {
                const runId = uuidv4()
                await monitor.trackEvent('llm', 'start', {
                    runId,
                    parentRunId: chainEventId,
                    name,
                    input
                })
                this.handlers['lunary'].llmEvent = { [runId]: runId }
                returnIds['lunary'].llmEvent = runId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const trace: LangWatchTrace | undefined = this.handlers['langWatch'].trace[parentIds['langWatch'].trace]
            if (trace) {
                const span = trace.startLLMSpan({
                    name,
                    input: autoconvertTypedValues(input)
                })
                this.handlers['langWatch'].span = { [span.spanId]: span }
                returnIds['langWatch'].span = span.spanId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const tracer: Tracer | undefined = this.handlers['arize'].client
            const rootSpan: Span | undefined = this.handlers['arize'].rootSpan

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const llmSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (llmSpan) {
                llmSpan.setAttribute('openinference.span.kind', 'LLM')
                llmSpan.setAttribute('input.value', JSON.stringify(input))
                llmSpan.setAttribute('input.mime_type', 'application/json')
            }
            const llmSpanId: any = llmSpan?.spanContext().spanId

            this.handlers['arize'].llmSpan = { [llmSpanId]: llmSpan }
            returnIds['arize'].llmSpan = llmSpanId
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const tracer: Tracer | undefined = this.handlers['phoenix'].client
            const rootSpan: Span | undefined = this.handlers['phoenix'].rootSpan

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const llmSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (llmSpan) {
                llmSpan.setAttribute('openinference.span.kind', 'LLM')
                llmSpan.setAttribute('input.value', JSON.stringify(input))
                llmSpan.setAttribute('input.mime_type', 'application/json')
            }
            const llmSpanId: any = llmSpan?.spanContext().spanId

            this.handlers['phoenix'].llmSpan = { [llmSpanId]: llmSpan }
            returnIds['phoenix'].llmSpan = llmSpanId
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

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const llmEventId: string = this.handlers['lunary'].llmEvent[returnIds['lunary'].llmEvent]
            const monitor = this.handlers['lunary'].client

            if (monitor && llmEventId) {
                await monitor.trackEvent('llm', 'end', {
                    runId: llmEventId,
                    output
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    output: autoconvertTypedValues(output)
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const llmSpan: Span | undefined = this.handlers['arize'].llmSpan[returnIds['arize'].llmSpan]
            if (llmSpan) {
                llmSpan.setAttribute('output.value', JSON.stringify(output))
                llmSpan.setAttribute('output.mime_type', 'application/json')
                llmSpan.setStatus({ code: SpanStatusCode.OK })
                llmSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const llmSpan: Span | undefined = this.handlers['phoenix'].llmSpan[returnIds['phoenix'].llmSpan]
            if (llmSpan) {
                llmSpan.setAttribute('output.value', JSON.stringify(output))
                llmSpan.setAttribute('output.mime_type', 'application/json')
                llmSpan.setStatus({ code: SpanStatusCode.OK })
                llmSpan.end()
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

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const llmEventId: string = this.handlers['lunary'].llmEvent[returnIds['lunary'].llmEvent]
            const monitor = this.handlers['lunary'].client

            if (monitor && llmEventId) {
                await monitor.trackEvent('llm', 'end', {
                    runId: llmEventId,
                    output: error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const llmSpan: Span | undefined = this.handlers['arize'].llmSpan[returnIds['arize'].llmSpan]
            if (llmSpan) {
                llmSpan.setAttribute('error.value', JSON.stringify(error))
                llmSpan.setAttribute('error.mime_type', 'application/json')
                llmSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                llmSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const llmSpan: Span | undefined = this.handlers['phoenix'].llmSpan[returnIds['phoenix'].llmSpan]
            if (llmSpan) {
                llmSpan.setAttribute('error.value', JSON.stringify(error))
                llmSpan.setAttribute('error.mime_type', 'application/json')
                llmSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                llmSpan.end()
            }
        }
    }

    async onToolStart(name: string, input: string | object, parentIds: ICommonObject) {
        const returnIds: ICommonObject = {
            langSmith: {},
            langFuse: {},
            lunary: {},
            langWatch: {},
            arize: {},
            phoenix: {}
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

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const monitor = this.handlers['lunary'].client
            const chainEventId: string = this.handlers['lunary'].chainEvent[parentIds['lunary'].chainEvent]

            if (monitor && chainEventId) {
                const runId = uuidv4()
                await monitor.trackEvent('tool', 'start', {
                    runId,
                    parentRunId: chainEventId,
                    name,
                    input
                })
                this.handlers['lunary'].toolEvent = { [runId]: runId }
                returnIds['lunary'].toolEvent = runId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const trace: LangWatchTrace | undefined = this.handlers['langWatch'].trace[parentIds['langWatch'].trace]
            if (trace) {
                const span = trace.startSpan({
                    name,
                    type: 'tool',
                    input: autoconvertTypedValues(input)
                })
                this.handlers['langWatch'].span = { [span.spanId]: span }
                returnIds['langWatch'].span = span.spanId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const tracer: Tracer | undefined = this.handlers['arize'].client
            const rootSpan: Span | undefined = this.handlers['arize'].rootSpan

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const toolSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (toolSpan) {
                toolSpan.setAttribute('openinference.span.kind', 'TOOL')
                toolSpan.setAttribute('input.value', JSON.stringify(input))
                toolSpan.setAttribute('input.mime_type', 'application/json')
            }
            const toolSpanId: any = toolSpan?.spanContext().spanId

            this.handlers['arize'].toolSpan = { [toolSpanId]: toolSpan }
            returnIds['arize'].toolSpan = toolSpanId
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const tracer: Tracer | undefined = this.handlers['phoenix'].client
            const rootSpan: Span | undefined = this.handlers['phoenix'].rootSpan

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const toolSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (toolSpan) {
                toolSpan.setAttribute('openinference.span.kind', 'TOOL')
                toolSpan.setAttribute('input.value', JSON.stringify(input))
                toolSpan.setAttribute('input.mime_type', 'application/json')
            }
            const toolSpanId: any = toolSpan?.spanContext().spanId

            this.handlers['phoenix'].toolSpan = { [toolSpanId]: toolSpan }
            returnIds['phoenix'].toolSpan = toolSpanId
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

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const toolEventId: string = this.handlers['lunary'].toolEvent[returnIds['lunary'].toolEvent]
            const monitor = this.handlers['lunary'].client

            if (monitor && toolEventId) {
                await monitor.trackEvent('tool', 'end', {
                    runId: toolEventId,
                    output
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    output: autoconvertTypedValues(output)
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const toolSpan: Span | undefined = this.handlers['arize'].toolSpan[returnIds['arize'].toolSpan]
            if (toolSpan) {
                toolSpan.setAttribute('output.value', JSON.stringify(output))
                toolSpan.setAttribute('output.mime_type', 'application/json')
                toolSpan.setStatus({ code: SpanStatusCode.OK })
                toolSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const toolSpan: Span | undefined = this.handlers['phoenix'].toolSpan[returnIds['phoenix'].toolSpan]
            if (toolSpan) {
                toolSpan.setAttribute('output.value', JSON.stringify(output))
                toolSpan.setAttribute('output.mime_type', 'application/json')
                toolSpan.setStatus({ code: SpanStatusCode.OK })
                toolSpan.end()
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

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const toolEventId: string = this.handlers['lunary'].llmEvent[returnIds['lunary'].toolEvent]
            const monitor = this.handlers['lunary'].client

            if (monitor && toolEventId) {
                await monitor.trackEvent('tool', 'end', {
                    runId: toolEventId,
                    output: error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const toolSpan: Span | undefined = this.handlers['arize'].toolSpan[returnIds['arize'].toolSpan]
            if (toolSpan) {
                toolSpan.setAttribute('error.value', JSON.stringify(error))
                toolSpan.setAttribute('error.mime_type', 'application/json')
                toolSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                toolSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const toolSpan: Span | undefined = this.handlers['phoenix'].toolSpan[returnIds['phoenix'].toolSpan]
            if (toolSpan) {
                toolSpan.setAttribute('error.value', JSON.stringify(error))
                toolSpan.setAttribute('error.mime_type', 'application/json')
                toolSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                toolSpan.end()
            }
        }
    }
}
