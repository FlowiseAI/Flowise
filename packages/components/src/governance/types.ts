export type PolicyEffect = 'allow' | 'deny' | 'escalate'

export type PolicyWhenOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not-contains' | 'starts-with' | 'regex'

export interface PolicyWhenCondition {
    path: string
    op: PolicyWhenOp
    value: unknown
}

export interface PolicyRule {
    id: string
    effect: PolicyEffect
    match: {
        tool: string
    }
    message?: string
    when?: PolicyWhenCondition[] // all conditions must match (AND)
    anyOf?: PolicyWhenCondition[] // at least one condition must match (OR)
}

export interface PolicyFile {
    version?: string
    rules: PolicyRule[]
}

export interface GovernanceContext {
    user?: string
    environment?: string
    [key: string]: unknown
}

export interface GovernanceConfig {
    policyPath: string
    auditPath: string
    context?: GovernanceContext
}

/** Session/node identifiers threaded through audit and gate calls. */
export interface GovernanceMeta {
    sessionId?: string
    chatId?: string
    nodeId?: string
}

export interface PolicyDecision {
    effect: PolicyEffect
    ruleId: string
    message: string
}

export type AuditStep = 'session_start' | 'session_end' | 'propose' | 'policy_decision' | 'hitl' | 'execute' | 'observe'

export interface AuditEntry {
    ts: string
    /** Unique identifier correlating all steps of a single tool invocation (propose→policy_decision→[hitl]→execute→observe). */
    traceId?: string
    step: AuditStep
    tool?: string
    args?: Record<string, unknown>
    /** For hitl steps: the original args before any reviewer modification. */
    originalArgs?: Record<string, unknown>
    /** For hitl steps: the reviewer-supplied arg overrides (undefined if no changes). */
    modifiedArgs?: Record<string, unknown>
    ruleId?: string
    effect?: PolicyEffect
    message?: string
    humanDecision?: string
    /** Free-text feedback from the human reviewer (optional). */
    feedback?: string
    sessionId?: string
    chatId?: string
    nodeId?: string
    observation?: string
    /** For session_start / session_end steps: the user's input query. */
    input?: string
    /** For session_end steps: the final agent response. */
    output?: string
    /** For session_end steps: total tool calls made in this session. */
    toolCallCount?: number
}

/**
 * A governance event surfaced to the UI via SSE so the chat interface can
 * render policy decisions as first-class artifacts rather than log lines.
 */
export interface GovernanceEvent {
    traceId: string
    step: AuditStep
    tool?: string
    args?: Record<string, unknown>
    effect?: PolicyEffect
    ruleId?: string
    message?: string
    humanDecision?: string
    feedback?: string
    ts: string
}

export const POLICY_DENY_PREFIX = '[POLICY_DENIED] '
