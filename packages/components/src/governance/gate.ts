import { randomBytes } from 'crypto'
import { appendAuditLog, truncateObservation } from './auditLogger'
import { loadPolicyFile } from './policyLoader'
import { evaluatePolicy } from './policyEvaluator'
import { GovernanceConfig, GovernanceEvent, PolicyDecision } from './types'

// ---------------------------------------------------------------------------
// Trace ID helpers
// ---------------------------------------------------------------------------

/**
 * Generate a short random trace ID to correlate all audit steps for a single
 * tool invocation: propose → policy_decision → [hitl] → execute → observe.
 */
export function generateTraceId(): string {
    return randomBytes(8).toString('hex')
}

// ---------------------------------------------------------------------------
// Gate input types
// ---------------------------------------------------------------------------

export interface GateToolCallInput {
    tool: string
    args: Record<string, unknown>
    governance: GovernanceConfig
    sessionId?: string
    chatId?: string
    nodeId?: string
    /** When true, skip writing the policy_decision audit entry (caller already audited). */
    skipAudit?: boolean
    /** Trace ID to correlate this gate call with its surrounding propose/execute/observe entries. */
    traceId?: string
}

// ---------------------------------------------------------------------------
// Core gate function
// ---------------------------------------------------------------------------

export function gateToolCall(input: GateToolCallInput): PolicyDecision {
    const { tool, args, governance, sessionId, chatId, nodeId, skipAudit, traceId } = input
    const context = governance.context || {}

    const policy = loadPolicyFile(governance.policyPath)
    const decision = evaluatePolicy(policy, tool, args, context)

    if (!skipAudit) {
        appendAuditLog(governance.auditPath, {
            traceId,
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

// ---------------------------------------------------------------------------
// Audit helpers — one per ReAct loop step
// ---------------------------------------------------------------------------

/**
 * Write a 'propose' entry when the agent first decides to call a tool.
 * Returns the traceId that must be threaded through all subsequent steps
 * for this tool invocation.
 */
export function auditPropose(input: GateToolCallInput): string {
    const traceId = input.traceId ?? generateTraceId()
    appendAuditLog(input.governance.auditPath, {
        traceId,
        step: 'propose',
        tool: input.tool,
        args: input.args,
        sessionId: input.sessionId,
        chatId: input.chatId,
        nodeId: input.nodeId
    })
    return traceId
}

/**
 * Write a 'hitl' entry after a human approves or rejects an escalated tool call.
 * Captures the original args, any reviewer-supplied modifications, and optional feedback.
 */
export function auditHitl(
    governance: GovernanceConfig,
    tool: string,
    args: Record<string, unknown>,
    humanDecision: string,
    meta?: {
        sessionId?: string
        chatId?: string
        nodeId?: string
        ruleId?: string
        traceId?: string
        originalArgs?: Record<string, unknown>
        modifiedArgs?: Record<string, unknown>
        feedback?: string
    }
): void {
    appendAuditLog(governance.auditPath, {
        traceId: meta?.traceId,
        step: 'hitl',
        tool,
        args,
        humanDecision,
        ruleId: meta?.ruleId,
        originalArgs: meta?.originalArgs,
        modifiedArgs: meta?.modifiedArgs,
        feedback: meta?.feedback,
        sessionId: meta?.sessionId,
        chatId: meta?.chatId,
        nodeId: meta?.nodeId
    })
}

/**
 * Write an 'execute' entry immediately before the tool is invoked.
 */
export function auditExecute(
    governance: GovernanceConfig,
    tool: string,
    args: Record<string, unknown>,
    observation: unknown,
    meta?: { sessionId?: string; chatId?: string; nodeId?: string; traceId?: string }
): void {
    appendAuditLog(governance.auditPath, {
        traceId: meta?.traceId,
        step: 'execute',
        tool,
        args,
        observation: truncateObservation(observation),
        sessionId: meta?.sessionId,
        chatId: meta?.chatId,
        nodeId: meta?.nodeId
    })
}

/**
 * Write an 'observe' entry after the LLM has processed the tool result.
 * This closes the loop: propose → policy_decision → [hitl] → execute → observe.
 */
export function auditObserve(
    governance: GovernanceConfig,
    tool: string,
    observation: unknown,
    meta?: { sessionId?: string; chatId?: string; nodeId?: string; traceId?: string }
): void {
    appendAuditLog(governance.auditPath, {
        traceId: meta?.traceId,
        step: 'observe',
        tool,
        observation: truncateObservation(observation),
        sessionId: meta?.sessionId,
        chatId: meta?.chatId,
        nodeId: meta?.nodeId
    })
}

/**
 * Write a 'session_start' entry at the beginning of an agent run.
 * Brackets the full run so audit consumers can group all tool invocations
 * by session without relying on sessionId alone.
 */
export function auditSessionStart(
    governance: GovernanceConfig,
    input: string,
    meta?: { sessionId?: string; chatId?: string; nodeId?: string }
): void {
    appendAuditLog(governance.auditPath, {
        step: 'session_start',
        input: truncateObservation(input, 1000),
        sessionId: meta?.sessionId,
        chatId: meta?.chatId,
        nodeId: meta?.nodeId
    })
}

/**
 * Write a 'session_end' entry at the end of an agent run.
 * Records the final response and total tool call count for the session.
 */
export function auditSessionEnd(
    governance: GovernanceConfig,
    output: string,
    toolCallCount: number,
    meta?: { sessionId?: string; chatId?: string; nodeId?: string }
): void {
    appendAuditLog(governance.auditPath, {
        step: 'session_end',
        output: truncateObservation(output, 1000),
        toolCallCount,
        sessionId: meta?.sessionId,
        chatId: meta?.chatId,
        nodeId: meta?.nodeId
    })
}

// ---------------------------------------------------------------------------
// Governance event builder (for SSE streaming to the UI)
// ---------------------------------------------------------------------------

/**
 * Build a GovernanceEvent suitable for streaming to the chat UI via SSE.
 * This makes every policy decision a first-class UI artifact, not just a log line.
 */
export function buildGovernanceEvent(
    step: GovernanceEvent['step'],
    traceId: string,
    tool?: string,
    args?: Record<string, unknown>,
    decision?: PolicyDecision,
    humanDecision?: string,
    feedback?: string
): GovernanceEvent {
    return {
        traceId,
        step,
        tool,
        args,
        effect: decision?.effect,
        ruleId: decision?.ruleId,
        message: decision?.message,
        humanDecision,
        feedback,
        ts: new Date().toISOString()
    }
}
