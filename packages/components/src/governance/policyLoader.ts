import * as fs from 'fs'
import * as path from 'path'
import { PolicyFile } from './types'

const policyCache = new Map<string, { mtimeMs: number; policy: PolicyFile }>()

/**
 * Walk up from __dirname (dist/src/governance/) to find the monorepo root.
 * Matches the pattern used by modelLoader.ts and utils.ts for locating files
 * relative to the package rather than process.cwd().
 */
function getRepoRoot(): string {
    // __dirname in dist: packages/components/dist/src/governance
    // Walk up: dist/src/governance -> dist/src -> dist -> components -> packages -> repo root
    const candidates = [
        path.join(__dirname, '..', '..', '..', '..', '..'), // dist build path
        path.join(__dirname, '..', '..', '..', '..'), // src path (ts-node / jest)
        path.join(__dirname, '..', '..', '..') // fallback
    ]
    for (const candidate of candidates) {
        if (fs.existsSync(path.join(candidate, 'package.json'))) {
            // Confirm it's the monorepo root (has packages/ dir)
            if (fs.existsSync(path.join(candidate, 'packages'))) {
                return candidate
            }
        }
    }
    // Last resort: process.cwd()
    return process.cwd()
}

export function loadPolicyFile(policyPath: string): PolicyFile {
    const resolved = path.isAbsolute(policyPath) ? policyPath : path.resolve(getRepoRoot(), policyPath)

    if (!fs.existsSync(resolved)) {
        throw new Error(`Policy file not found: ${resolved}`)
    }

    const stat = fs.statSync(resolved)
    const cached = policyCache.get(resolved)
    if (cached && cached.mtimeMs === stat.mtimeMs) {
        return cached.policy
    }

    const raw = fs.readFileSync(resolved, 'utf8')
    const parsed = JSON.parse(raw) as PolicyFile

    if (!parsed.rules || !Array.isArray(parsed.rules)) {
        throw new Error(`Invalid policy file: ${resolved} — expected { "rules": [...] }`)
    }

    if (parsed.version !== undefined && typeof parsed.version !== 'string') {
        throw new Error(`Invalid policy file: ${resolved} — "version" must be a string`)
    }

    policyCache.set(resolved, { mtimeMs: stat.mtimeMs, policy: parsed })
    return parsed
}

export function clearPolicyCache(): void {
    policyCache.clear()
}
