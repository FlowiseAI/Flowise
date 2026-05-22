export type PolicyEffect = 'allow' | 'deny' | 'escalate'

export type PolicyWhenOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not-contains'

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

export interface PolicyDecision {
    effect: PolicyEffect
    ruleId: string
    message: string
}

export type AuditStep = 'propose' | 'policy_decision' | 'hitl' | 'execute' | 'observe'

export interface AuditEntry {
    ts: string
    step: AuditStep
    tool?: string
    args?: Record<string, unknown>
    ruleId?: string
    effect?: PolicyEffect
    message?: string
    humanDecision?: string
    sessionId?: string
    chatId?: string
    nodeId?: string
    observation?: string
}

export const POLICY_DENY_PREFIX = '[POLICY_DENIED] '
