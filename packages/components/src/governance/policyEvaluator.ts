import { GovernanceContext, PolicyDecision, PolicyFile, PolicyRule, PolicyCondition } from './types'

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
 * Attempt to extract structured key/value pairs from a free-form text string.
 *
 * Handles the formats LLMs commonly produce when a tool schema only exposes a
 * single `input` parameter:
 *
 *   1. JSON object string          {"to":"a@b.com","subject":"Hi"}
 *   2. Email-style headers         To: a@b.com\nSubject: Hi\n\nBody text
 *   3. key: value lines            to: a@b.com\nsubject: Hi\nbody: text
 *   4. key=value pairs             to=a@b.com;subject=Hi;body=text
 *   5. key=value semicolon/comma   to=a@b.com, subject=Hi, body=text
 *
 * Returns a map of lowercased keys → string values, or null if no structured
 * data could be extracted (fewer than 2 key/value pairs found).
 */
function parseTextInput(input: string): Record<string, string> | null {
    // 1. JSON object
    try {
        const parsed = JSON.parse(input)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, string>
        }
    } catch {
        // not JSON — continue
    }

    const result: Record<string, string> = {}

    // 2 & 3. Line-based "Key: Value" or "key: value" (covers email headers too).
    //   Lines with no colon after the first blank line are treated as the body.
    const lines = input.split(/\r?\n/)
    let bodyLines: string[] = []
    let inBody = false
    let lineMatches = 0

    for (const line of lines) {
        if (inBody) {
            bodyLines.push(line)
            continue
        }
        if (line.trim() === '') {
            // Blank line separates headers from body (email convention)
            inBody = true
            continue
        }
        const colonIdx = line.indexOf(':')
        if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim().toLowerCase()
            const val = line.slice(colonIdx + 1).trim()
            // Only treat as a header if the key looks like a word (no spaces)
            if (/^\w+$/.test(key)) {
                result[key] = val
                lineMatches++
            } else {
                // Doesn't look like a header — treat rest as body
                inBody = true
                bodyLines.push(line)
            }
        } else {
            // No colon — treat rest as body
            inBody = true
            bodyLines.push(line)
        }
    }

    if (bodyLines.length > 0 && !result['body']) {
        result['body'] = bodyLines.join('\n').trim()
    }

    if (lineMatches >= 1) {
        return result
    }

    // 4 & 5. key=value pairs separated by semicolons or commas
    //   e.g. "to=a@b.com;subject=Hi;body=text"
    const kvResult: Record<string, string> = {}
    let kvMatches = 0
    const segments = input.split(/[;,]/)
    for (const seg of segments) {
        const eqIdx = seg.indexOf('=')
        if (eqIdx > 0) {
            const key = seg.slice(0, eqIdx).trim().toLowerCase()
            const val = seg.slice(eqIdx + 1).trim()
            if (/^\w+$/.test(key)) {
                kvResult[key] = val
                kvMatches++
            }
        }
    }
    if (kvMatches >= 2) {
        return kvResult
    }

    return null
}

/**
 * If args only has a single "input" key, attempt to parse its value into
 * structured fields and merge them into args so that policy conditions like
 * `args.to` or `args.amount` can match even when the LLM serializes all
 * parameters into a single string.
 *
 * Handles JSON objects, email-style headers, key:value lines, and key=value
 * pairs — the four formats LLMs most commonly produce.
 */
function flattenJsonInput(args: Record<string, unknown>): Record<string, unknown> {
    const keys = Object.keys(args)
    if (keys.length === 1 && keys[0] === 'input' && typeof args.input === 'string') {
        const parsed = parseTextInput(args.input)
        if (parsed) {
            return { ...args, ...parsed }
        }
    }
    return args
}

/**
 * Match a tool name against a pattern.
 *   "*"       — matches everything
 *   "send_*"  — prefix wildcard (trailing * only)
 *   exact     — original behaviour
 */
function toolNameMatches(pattern: string, toolName: string): boolean {
    if (pattern === '*') return true
    if (pattern.endsWith('*')) {
        return toolName.startsWith(pattern.slice(0, -1))
    }
    return pattern === toolName
}

function evaluateCondition(condition: PolicyCondition, args: Record<string, unknown>, context: GovernanceContext): boolean {
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
        case 'starts-with':
            return typeof value === 'string' && typeof expected === 'string' && value.startsWith(expected)
        case 'regex': {
            if (typeof value !== 'string' || typeof expected !== 'string') return false
            try {
                return new RegExp(expected).test(value)
            } catch {
                // Malformed regex in policy — treat as no-match rather than crashing
                console.warn(`[Governance] Invalid regex in policy condition: ${expected}`)
                return false
            }
        }
        default:
            return false
    }
}

function ruleMatches(rule: PolicyRule, toolName: string, args: Record<string, unknown>, context: GovernanceContext): boolean {
    if (!toolNameMatches(rule.match.tool, toolName)) {
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
 * Place more specific rules before broader ones — e.g. an allow for a trusted
 * domain before a deny-all, or a specific tool rule before a wildcard catch-all.
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
