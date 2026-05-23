import { policies, PolicyRule } from './policyLoader'
/* eslint-disable no-console */

export interface PolicyDecision {
    decision: 'allow' | 'deny' | 'escalate'
    reason: string
    matchedRule: PolicyRule | null
}

export const checkPolicy = (toolName: string, _toolInput: any): PolicyDecision => {
    const normalizedToolName = toolName.toLowerCase().trim()

    // Loop through rules looking for a match
    for (const rule of policies.rules) {
        if (rule.toolName.toLowerCase() === normalizedToolName) {
            console.log(`[Governance] Policy matched: ${rule.toolName} → ${rule.decision}`)
            return {
                decision: rule.decision,
                reason: rule.reason,
                matchedRule: rule
            }
        }
    }

    // No rule matched — use default decision from policy file
    console.log(`[Governance] No policy found for tool: ${toolName} → ${policies.defaultDecision}`)
    return {
        decision: policies.defaultDecision,
        reason: `No policy rule found for tool: ${toolName}`,
        matchedRule: null
    }
}
