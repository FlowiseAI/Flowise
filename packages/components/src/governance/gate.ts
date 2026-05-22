import { appendAuditLog, truncateObservation } from './auditLogger'
import { loadPolicyFile } from './policyLoader'
import { evaluatePolicy } from './policyEngine'
import { GovernanceConfig, PolicyDecision } from './types'

export interface GateToolCallInput {
    tool: string
    args: Record<string, unknown>
    governance: GovernanceConfig
    sessionId?: string
    chatId?: string
    nodeId?: string
    skipAudit?: boolean
}

export function gateToolCall(input: GateToolCallInput): PolicyDecision {
    const { tool, args, governance, sessionId, chatId, nodeId, skipAudit } = input
    const context = governance.context || {}

    const policy = loadPolicyFile(governance.policyPath)
    const decision = evaluatePolicy(policy, tool, args, context)

    if (!skipAudit) {
        appendAuditLog(governance.auditPath, {
            step: 'policy_decision',
            tool,
            args,
            ruleId: decision.ruleId,
            effect: decision.effect,
            message: decision.message,
            sessionId,
            chatId,
            nodeId
        })
    }

    return decision
}

export function auditPropose(input: GateToolCallInput): void {
    appendAuditLog(input.governance.auditPath, {
        step: 'propose',
        tool: input.tool,
        args: input.args,
        sessionId: input.sessionId,
        chatId: input.chatId,
        nodeId: input.nodeId
    })
}

export function auditHitl(
    governance: GovernanceConfig,
    tool: string,
    args: Record<string, unknown>,
    humanDecision: string,
    meta?: { sessionId?: string; chatId?: string; nodeId?: string; ruleId?: string }
): void {
    appendAuditLog(governance.auditPath, {
        step: 'hitl',
        tool,
        args,
        humanDecision,
        ruleId: meta?.ruleId,
        sessionId: meta?.sessionId,
        chatId: meta?.chatId,
        nodeId: meta?.nodeId
    })
}

export function auditExecute(
    governance: GovernanceConfig,
    tool: string,
    args: Record<string, unknown>,
    observation: unknown,
    meta?: { sessionId?: string; chatId?: string; nodeId?: string }
): void {
    appendAuditLog(governance.auditPath, {
        step: 'execute',
        tool,
        args,
        observation: truncateObservation(observation),
        sessionId: meta?.sessionId,
        chatId: meta?.chatId,
        nodeId: meta?.nodeId
    })
}
