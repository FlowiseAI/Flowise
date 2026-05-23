import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
/* eslint-disable no-console */

// Shape of a single policy rule
export interface PolicyRule {
    toolName: string
    decision: 'allow' | 'deny' | 'escalate'
    reason: string
    matchArgs: Record<string, any>
}

// Shape of the entire policy file
export interface PolicyConfig {
    defaultDecision: 'allow' | 'deny'
    rules: PolicyRule[]
}

// Load once at module level — cached for the entire session
const POLICY_PATH = path.resolve(__dirname, '../policies.yaml')

export const loadPolicies = (): PolicyConfig => {
    try {
        const fileContents = fs.readFileSync(POLICY_PATH, 'utf8')
        const parsed = yaml.load(fileContents) as PolicyConfig
        console.log(`[Governance] Loaded ${parsed.rules.length} policy rules`)
        return parsed
    } catch (e) {
        console.error('[Governance] Failed to load policies.yaml — defaulting to deny-all')
        return {
            defaultDecision: 'deny',
            rules: []
        }
    }
}

// Cached instance — loaded once, reused every tool call
export const policies: PolicyConfig = loadPolicies()
