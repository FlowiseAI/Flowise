import * as fs from 'fs'
import * as path from 'path'
import { AuditEntry } from './types'

/**
 * Walk up from __dirname to find the monorepo root.
 * Mirrors the pattern in policyLoader.ts and modelLoader.ts.
 */
function getRepoRoot(): string {
    const candidates = [
        path.join(__dirname, '..', '..', '..', '..', '..'), // dist build path
        path.join(__dirname, '..', '..', '..', '..'), // src path (ts-node / jest)
        path.join(__dirname, '..', '..', '..') // fallback
    ]
    for (const candidate of candidates) {
        if (fs.existsSync(path.join(candidate, 'package.json')) && fs.existsSync(path.join(candidate, 'packages'))) {
            return candidate
        }
    }
    return process.cwd()
}

export function appendAuditLog(auditPath: string, entry: Omit<AuditEntry, 'ts'>): void {
    const resolved = path.isAbsolute(auditPath) ? auditPath : path.resolve(getRepoRoot(), auditPath)
    const dir = path.dirname(resolved)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    const line: AuditEntry = {
        ts: new Date().toISOString(),
        ...entry
    }

    fs.appendFileSync(resolved, JSON.stringify(line) + '\n', 'utf8')
}

export function truncateObservation(obs: unknown, maxLen = 500): string {
    const str = typeof obs === 'string' ? obs : JSON.stringify(obs)
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}
