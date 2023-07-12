import { BaseTracer, Run, BaseCallbackHandler } from 'langchain/callbacks'
import { AgentAction, ChainValues } from 'langchain/schema'
import { Logger } from 'winston'
import { Server } from 'socket.io'

interface AgentRun extends Run {
    actions: AgentAction[]
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
        const breadcrumbs = [...parents, run]

        return {
            toJSON: () => {
                return breadcrumbs
            },
            toString: () => {
                return breadcrumbs
                    .map((parent) => {
                        return `${parent.execution_order}:${parent.run_type}:${parent.name}`
                    })
                    .join(' > ')
            }
        }
    }

    // logging methods

    onChainStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[chain/start] [${crumbs}] Entering Chain run`, {
            input: run.inputs?.input,
            inputs: run.inputs,
            id: run.id,
            parentRunId: run.parent_run_id,
            name: run.name,
            run_type: run.run_type,
            tags: run.tags,
            _run: run
        })
    }

    onChainEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[chain/end] [${crumbs}] [${elapsed(run)}] Exiting Chain run`, {
            output: run.outputs?.response,
            outputs: run.outputs,
            id: run.id,
            parentRunId: run.parent_run_id,
            name: run.name,
            run_type: run.run_type,
            tags: run.tags,
            _run: run
        })
    }

    onChainError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[chain/error] [${crumbs}] [${elapsed(run)}] Chain run reported an error`, {
            error: run.error,
            id: run.id,
            parentRunId: run.parent_run_id,
            name: run.name,
            run_type: run.run_type,
            tags: run.tags,
            _run: run
        })
    }

    onLLMStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        const inputs = 'prompts' in run.inputs ? { prompts: (run.inputs.prompts as string[]).map((p) => p.trim()) } : run.inputs
        this.logger.verbose(`[llm/start] [${crumbs}] Entering LLM run`, {
            inputs: inputs,
            id: run.id,
            parentRunId: run.parent_run_id,
            name: run.name,
            run_type: run.run_type,
            tags: run.tags,
            _run: run
        })
    }

    onLLMEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[llm/end] [${crumbs}] [${elapsed(run)}] Exiting LLM run`, {
            outputs: run.outputs,
            id: run.id,
            parentRunId: run.parent_run_id,
            name: run.name,
            run_type: run.run_type,
            tags: run.tags,
            _run: run
        })
    }

    onLLMError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[llm/error] [${crumbs}] [${elapsed(run)}] LLM run reported an error`, {
            error: run.error,
            id: run.id,
            parentRunId: run.parent_run_id,
            name: run.name,
            run_type: run.run_type,
            tags: run.tags,
            _run: run
        })
    }

    onToolStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[tool/start] [${crumbs}] Entering Tool run with input: "${run.inputs.input?.trim()}"`, {
            id: run.id,
            parentRunId: run.parent_run_id,
            name: run.name,
            run_type: run.run_type,
            tags: run.tags,
            _run: run
        })
    }

    onToolEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[tool/end] [${crumbs}] [${elapsed(run)}] Exiting Tool run with output: "${run.outputs?.output?.trim()}"`, {
            id: run.id,
            parentRunId: run.parent_run_id,
            name: run.name,
            run_type: run.run_type,
            tags: run.tags,
            _run: run
        })
    }

    onToolError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[tool/error] [${crumbs}] [${elapsed(run)}] Tool run reported an error`, {
            error: run.error,
            id: run.id,
            parentRunId: run.parent_run_id,
            name: run.name,
            run_type: run.run_type,
            tags: run.tags,
            _run: run
        })
    }

    onAgentAction(run: Run) {
        const agentRun = run as AgentRun
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[agent/action] [${crumbs}] Agent selected action`, {
            action: agentRun.actions[agentRun.actions.length - 1],
            id: run.id,
            parentRunId: run.parent_run_id,
            name: run.name,
            run_type: run.run_type,
            tags: run.tags,
            _run: run
        })
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

    constructor(socketIO: Server, socketIOClientId: string, skipK?: number, returnSourceDocuments?: boolean) {
        super()
        this.socketIO = socketIO
        this.socketIOClientId = socketIOClientId
        this.skipK = skipK ?? this.skipK
        this.returnSourceDocuments = returnSourceDocuments ?? this.returnSourceDocuments
    }

    handleLLMStart() {
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

    handleChainEnd(outputs: ChainValues): void | Promise<void> {
        if (this.returnSourceDocuments) {
            this.socketIO.to(this.socketIOClientId).emit('sourceDocuments', outputs?.sourceDocuments)
        }
    }
}
