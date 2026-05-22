import { RunnableConfig } from '@langchain/core/runnables'
import { Tool } from '@langchain/core/tools'
import { ICommonObject } from '../Interface'
import { gateToolCall } from './gate'
import { GovernanceConfig, POLICY_DENY_PREFIX } from './types'

/**
 * Wraps a Tool so that .call() cannot bypass governance when enabled.
 * The Agent executor also gates before call — this is defense in depth.
 */
export class GovernedTool extends Tool {
    name: string
    description: string
    private inner: Tool
    private governance: GovernanceConfig
    private sessionId?: string
    private chatId?: string
    private nodeId?: string

    constructor(inner: Tool, governance: GovernanceConfig, meta?: { sessionId?: string; chatId?: string; nodeId?: string }) {
        super()
        this.inner = inner
        this.name = inner.name
        this.description = inner.description
        this.governance = governance
        this.sessionId = meta?.sessionId
        this.chatId = meta?.chatId
        this.nodeId = meta?.nodeId
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((inner as any).returnDirect !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(this as any).returnDirect = (inner as any).returnDirect
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((inner as any).requiresHumanInput !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(this as any).requiresHumanInput = (inner as any).requiresHumanInput
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((inner as any).agentSelectedTool !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(this as any).agentSelectedTool = (inner as any).agentSelectedTool
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async _call(arg: any): Promise<string> {
        // Gate check (defense-in-depth; skipAudit=true since Agent.ts already audits)
        const args = (arg || {}) as Record<string, unknown>
        const decision = gateToolCall({
            tool: this.name,
            args,
            governance: this.governance,
            sessionId: this.sessionId,
            chatId: this.chatId,
            nodeId: this.nodeId ?? (this.governance.context?.nodeId as string | undefined),
            skipAudit: true
        })

        if (decision.effect === 'deny') {
            return POLICY_DENY_PREFIX + decision.message
        }

        // 'escalate' is handled by the agent loop (Agent.ts handleToolCalls / handleResumedToolCalls)
        // before .call() is ever invoked. If execution reaches here with an escalate decision it means
        // the human has already approved via HITL, so we fall through and execute the inner tool.

        // Delegate to inner tool's _call if available, otherwise invoke
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const innerAny = this.inner as any
        if (typeof innerAny._call === 'function') {
            return innerAny._call(arg)
        }
        return this.inner.invoke(arg) as Promise<string>
    }

    async call(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arg: any,
        configArg?: RunnableConfig,
        tags?: string[],
        flowConfig?: { sessionId?: string; chatId?: string; input?: string; state?: ICommonObject }
    ): Promise<string> {
        const args = (arg || {}) as Record<string, unknown>
        const decision = gateToolCall({
            tool: this.name,
            args,
            governance: this.governance,
            sessionId: this.sessionId ?? flowConfig?.sessionId,
            chatId: this.chatId ?? flowConfig?.chatId,
            nodeId: this.nodeId ?? (this.governance.context?.nodeId as string | undefined),
            skipAudit: true
        })

        if (decision.effect === 'deny') {
            return POLICY_DENY_PREFIX + decision.message
        }

        // 'escalate' is handled upstream in the agent loop before .call() is invoked.
        // Reaching here means the human has already approved — fall through to execute.

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const innerAny = this.inner as any
        if (typeof innerAny.call === 'function') {
            return innerAny.call(arg, configArg, tags, flowConfig)
        }
        return this.inner.invoke(arg, configArg as RunnableConfig) as Promise<string>
    }
}

export function wrapToolWithGovernance(
    tool: Tool,
    governance: GovernanceConfig,
    meta?: { sessionId?: string; chatId?: string; nodeId?: string }
): Tool {
    return new GovernedTool(tool, governance, meta) as unknown as Tool
}
