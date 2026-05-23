import * as fs from 'fs'
import * as path from 'path'
import { AuditEntry } from './types'

export function appendAuditLog(auditPath: string, entry: Omit<AuditEntry, 'ts'>): void {
    const dir = path.dirname(auditPath)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    const line: AuditEntry = {
        ts: new Date().toISOString(),
        ...entry
    }

    fs.appendFileSync(auditPath, JSON.stringify(line) + '\n', 'utf8')
}

export function truncateObservation(obs: unknown, maxLen = 500): string {
    const str = typeof obs === 'string' ? obs : JSON.stringify(obs)
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}
