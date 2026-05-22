import { GovernanceContext, PolicyDecision, PolicyFile, PolicyRule, PolicyWhenCondition } from './types'

const DEFAULT_ALLOW: PolicyDecision = {
    effect: 'allow',
    ruleId: 'default-allow',
    message: 'No matching policy rule; allowed by default.'
}

function getValueAtPath(obj: Record<string, unknown>, dotPath: string): unknown {
    const parts = dotPath.split('.')
    let current: unknown = obj
    for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return undefined
        }
        current = (current as Record<string, unknown>)[part]
    }
    return current
}

/**
 * If args only has a single "input" key whose value is a JSON string,
 * parse it and merge the resulting fields into args so that policy
 * conditions like `args.recipient` or `args.to` can match even when
 * the LLM serialises all parameters into a single JSON-encoded string.
 */
function flattenJsonInput(args: Record<string, unknown>): Record<string, unknown> {
    const keys = Object.keys(args)
    if (keys.length === 1 && keys[0] === 'input' && typeof args.input === 'string') {
        try {
            const parsed = JSON.parse(args.input)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return { ...args, ...(parsed as Record<string, unknown>) }
            }
        } catch {
            // not valid JSON — leave args unchanged
        }
    }
    return args
}

function evaluateCondition(condition: PolicyWhenCondition, args: Record<string, unknown>, context: GovernanceContext): boolean {
    const flatArgs = flattenJsonInput(args)
    let value: unknown
    if (condition.path.startsWith('args.')) {
        value = getValueAtPath({ args: flatArgs }, condition.path)
    } else if (condition.path.startsWith('context.')) {
        value = getValueAtPath({ context }, condition.path)
    } else {
        value = getValueAtPath({ args: flatArgs, context }, condition.path)
    }

    const expected = condition.value

    switch (condition.op) {
        case 'eq':
            return value === expected
        case 'neq':
            return value !== expected
        case 'gt': {
            const numVal = typeof value === 'number' ? value : Number(value)
            const numExp = typeof expected === 'number' ? expected : Number(expected)
            return !isNaN(numVal) && !isNaN(numExp) && numVal > numExp
        }
        case 'gte': {
            const numVal = typeof value === 'number' ? value : Number(value)
            const numExp = typeof expected === 'number' ? expected : Number(expected)
            return !isNaN(numVal) && !isNaN(numExp) && numVal >= numExp
        }
        case 'lt': {
            const numVal = typeof value === 'number' ? value : Number(value)
            const numExp = typeof expected === 'number' ? expected : Number(expected)
            return !isNaN(numVal) && !isNaN(numExp) && numVal < numExp
        }
        case 'lte': {
            const numVal = typeof value === 'number' ? value : Number(value)
            const numExp = typeof expected === 'number' ? expected : Number(expected)
            return !isNaN(numVal) && !isNaN(numExp) && numVal <= numExp
        }
        case 'contains':
            return typeof value === 'string' && typeof expected === 'string' && value.includes(expected)
        case 'not-contains':
            return typeof value === 'string' && typeof expected === 'string' && !value.includes(expected)
        default:
            return false
    }
}

function ruleMatches(rule: PolicyRule, toolName: string, args: Record<string, unknown>, context: GovernanceContext): boolean {
    if (rule.match.tool !== toolName) {
        return false
    }
    // when: all conditions must match (AND)
    if (rule.when && rule.when.length > 0) {
        if (!rule.when.every((c) => evaluateCondition(c, args, context))) {
            return false
        }
    }
    // anyOf: at least one condition must match (OR)
    if (rule.anyOf && rule.anyOf.length > 0) {
        if (!rule.anyOf.some((c) => evaluateCondition(c, args, context))) {
            return false
        }
    }
    return true
}

function ruleToDecision(rule: PolicyRule): PolicyDecision {
    return {
        effect: rule.effect,
        ruleId: rule.id,
        message: rule.message || `Policy rule "${rule.id}" (${rule.effect}).`
    }
}

/**
 * Evaluate rules in file order; first match wins.
 * Place more specific rules (allow for trusted domains, deny for specific tools)
 * before broader rules (escalate catch-all) in the policy file.
 */
export function evaluatePolicy(
    policy: PolicyFile,
    toolName: string,
    args: Record<string, unknown>,
    context: GovernanceContext = {}
): PolicyDecision {
    const normalizedArgs = (args || {}) as Record<string, unknown>

    for (const rule of policy.rules) {
        if (ruleMatches(rule, toolName, normalizedArgs, context)) {
            return ruleToDecision(rule)
        }
    }

    return DEFAULT_ALLOW
}
