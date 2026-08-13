import * as fs from 'fs'
import * as path from 'path'
/* eslint-disable no-console */

// Shape of one audit log entry
export interface AuditEntry {
    timestamp: string
    toolName: string
    toolInput: any
    policyDecision: 'allow' | 'deny' | 'escalate'
    policyReason: string
    matchedRule: string | null
    humanDecision?: 'approved' | 'rejected'
    humanWho?: string
    observation?: string
    sessionId?: string
    chatId?: string
}

// Audit log file sits at project root for easy access during demo
const AUDIT_LOG_PATH = path.resolve(__dirname, '../../../../../audit.log')

export const writeAuditLog = (entry: AuditEntry): void => {
    try {
        const entryWithTimestamp: AuditEntry = {
            ...entry,
            timestamp: new Date().toISOString()
        }
        const line = JSON.stringify(entryWithTimestamp) + '\n'
        fs.appendFileSync(AUDIT_LOG_PATH, line, 'utf8')
        console.log(`[Audit] Written: ${entry.toolName} → ${entry.policyDecision}`)
    } catch (e) {
        console.error('[Audit] Failed to write audit log entry:', e)
    }
}
