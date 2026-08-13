import * as fs from 'fs'
import { PolicyFile } from './types'

const policyCache = new Map<string, { mtimeMs: number; policy: PolicyFile }>()

export function loadPolicyFile(policyPath: string): PolicyFile {
    if (!fs.existsSync(policyPath)) {
        throw new Error(`Policy file not found: ${policyPath}`)
    }

    const stat = fs.statSync(policyPath)
    const cached = policyCache.get(policyPath)
    if (cached && cached.mtimeMs === stat.mtimeMs) {
        return cached.policy
    }

    const raw = fs.readFileSync(policyPath, 'utf8')
    const parsed = JSON.parse(raw) as PolicyFile

    if (!parsed.rules || !Array.isArray(parsed.rules)) {
        throw new Error(`Invalid policy file: ${policyPath} — expected { "rules": [...] }`)
    }

    if (parsed.version !== undefined && typeof parsed.version !== 'string') {
        throw new Error(`Invalid policy file: ${policyPath} — "version" must be a string`)
    }

    policyCache.set(policyPath, { mtimeMs: stat.mtimeMs, policy: parsed })
    return parsed
}

export function clearPolicyCache(): void {
    policyCache.clear()
}
