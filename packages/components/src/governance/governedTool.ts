import { RunnableConfig } from '@langchain/core/runnables'
import { Tool } from '@langchain/core/tools'
import { ICommonObject } from '../Interface'
import { gateToolCall } from './gate'
import { GovernanceConfig, POLICY_DENY_PREFIX } from './types'

/**
 * Wraps a Tool so that .call() cannot bypass governance when enabled.
 *
 * The Agent executor also gates before call — this is defense in depth.
 *
 * Escalation handling:
 * - When called FROM the agent loop (Agent.ts handleToolCalls / handleResumedToolCalls),
 *   the loop intercepts escalations BEFORE calling .call(), so execution never reaches here
 *   with an unreviewed escalation.
 * - When called OUTSIDE the agent loop (e.g. direct tool invocation in tests or custom code),
 *   an escalation is treated as a soft deny: the tool returns a message explaining that human
 *   approval is required. This prevents silent execution of escalation-class actions.
 */
export class GovernedTool extends Tool {
    name: string
    description: string
    private inner: Tool
    private governance: GovernanceConfig
    private sessionId?: string
    private chatId?: string
    private nodeId?: string
    /**
     * When true, the caller (agent loop) has already obtained human approval for an
     * escalated tool call. The GovernedTool will skip the escalation guard and execute.
     * This flag is set transiently by the agent loop before calling .call().
     */
    humanApproved: boolean = false

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
        const args = (arg || {}) as Record<string, unknown>
        const decision = gateToolCall({
            tool: this.name,
            args,
            governance: this.governance,
            sessionId: this.sessionId,
            chatId: this.chatId,
            nodeId: this.nodeId ?? (this.governance.context?.nodeId as string | undefined),
            skipAudit: true // Agent.ts already audits; this is defense-in-depth
        })

        if (decision.effect === 'deny') {
            return POLICY_DENY_PREFIX + decision.message
        }

        if (decision.effect === 'escalate' && !this.humanApproved) {
            // Called outside the agent loop without prior human approval.
            // Treat as a soft deny to prevent silent execution of escalation-class actions.
            return (
                POLICY_DENY_PREFIX +
                `[ESCALATION REQUIRED] ${decision.message} ` +
                `(rule: ${decision.ruleId}). Human approval is required before this tool can execute.`
            )
        }

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
            skipAudit: true // Agent.ts already audits; this is defense-in-depth
        })

        if (decision.effect === 'deny') {
            return POLICY_DENY_PREFIX + decision.message
        }

        if (decision.effect === 'escalate' && !this.humanApproved) {
            // Called outside the agent loop without prior human approval.
            return (
                POLICY_DENY_PREFIX +
                `[ESCALATION REQUIRED] ${decision.message} ` +
                `(rule: ${decision.ruleId}). Human approval is required before this tool can execute.`
            )
        }

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
