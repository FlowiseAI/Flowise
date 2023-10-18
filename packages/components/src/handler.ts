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
