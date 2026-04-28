import { BaseTracer, Run } from '@langchain/core/tracers/base'
import { Logger } from 'winston'
import { AgentRun, elapsed, tryJsonStringify } from './handler'

export class MetricsLogger extends BaseTracer {
    name = 'console_callback_handler' as const
    logger: Logger
    orgId?: string

    protected persistRun(_run: Run) {
        return Promise.resolve()
    }

    constructor(logger: Logger, orgId?: string) {
        super()
        this.logger = logger
        this.orgId = orgId
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
        this.logger.verbose(
            `[${this.orgId}]: [chain/start] [${crumbs}] Entering Chain run with input: ${tryJsonStringify(run.inputs, '[inputs]')}`
        )
    }

    onChainEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[${this.orgId}]: [chain/end] [${crumbs}] [${elapsed(run)}] Exiting Chain run with output: ${tryJsonStringify(
                run.outputs,
                '[outputs]'
            )}`
        )
    }

    onChainError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[${this.orgId}]: [chain/error] [${crumbs}] [${elapsed(run)}] Chain run errored with error: ${tryJsonStringify(
                run.error,
                '[error]'
            )}`
        )
    }

    onLLMStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        const inputs = 'prompts' in run.inputs ? { prompts: (run.inputs.prompts as string[]).map((p) => p.trim()) } : run.inputs
        this.logger.verbose(`[${this.orgId}]: [llm/start] [${crumbs}] Entering LLM run with input: ${tryJsonStringify(inputs, '[inputs]')}`)
    }

    onLLMEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[${this.orgId}]: [llm/end] [${crumbs}] [${elapsed(run)}] Exiting LLM run with output: ${tryJsonStringify(
                run.outputs,
                '[response]'
            )}`
        )
    }

    onLLMError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[${this.orgId}]: [llm/error] [${crumbs}] [${elapsed(run)}] LLM run errored with error: ${tryJsonStringify(
                run.error,
                '[error]'
            )}`
        )
    }

    onToolStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[${this.orgId}]: [tool/start] [${crumbs}] Entering Tool run with input: "${run.inputs.input?.trim()}"`)
    }

    onToolEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[${this.orgId}]: [tool/end] [${crumbs}] [${elapsed(run)}] Exiting Tool run with output: "${run.outputs?.output?.trim()}"`
        )
    }

    onToolError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[${this.orgId}]: [tool/error] [${crumbs}] [${elapsed(run)}] Tool run errored with error: ${tryJsonStringify(
                run.error,
                '[error]'
            )}`
        )
    }

    onAgentAction(run: Run) {
        const agentRun = run as AgentRun
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[${this.orgId}]: [agent/action] [${crumbs}] Agent selected action: ${tryJsonStringify(
                agentRun.actions[agentRun.actions.length - 1],
                '[action]'
            )}`
        )
    }
}
