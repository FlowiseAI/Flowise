import path from 'node:path'
import { homedir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { BackendProtocol, FileData } from './BackendProtocol'
import { CompositeBackend } from './backends/CompositeBackend'
import { LocalBackend } from './backends/LocalBackend'
import { ReadOnlyBackend } from './backends/ReadOnlyBackend'
import { StateBackend } from './backends/StateBackend'

type FileStore = Record<string, FileData>

export function getSandboxType(): string {
    return process.env.SANDBOX_TYPE || 'state'
}

export function sanitizeSegment(value: string): string {
    const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
    return cleaned || '_'
}

export function buildScopeSegments(scope?: { orgId?: string; chatflowid?: string; chatId?: string }): string[] {
    const orgSeg = scope?.orgId ? sanitizeSegment(scope.orgId) : '_no_org'
    const flowSeg = scope?.chatflowid ? sanitizeSegment(scope.chatflowid) : '_no_flow'
    // Random suffix for missing chatId — prevents two no-chat runs from sharing a workspace.
    const chatSeg = scope?.chatId ? sanitizeSegment(scope.chatId) : `_ephemeral_${randomBytes(8).toString('hex')}`
    return [orgSeg, flowSeg, chatSeg]
}

export async function createBackend(
    initialFiles?: FileStore,
    scope?: { orgId?: string; chatflowid?: string; chatId?: string }
): Promise<BackendProtocol> {
    const type = getSandboxType()
    switch (type) {
        case 'state':
            return new StateBackend(initialFiles)
        case 'local': {
            const base = process.env.SANDBOX_LOCAL_PATH || path.join(homedir(), '.flowise', 'sandbox')
            const root = path.join(base, ...buildScopeSegments(scope))
            return new LocalBackend(root)
        }
        case 'composite':
            return new CompositeBackend(new StateBackend(initialFiles), {})
        default:
            throw new Error(`Unknown SANDBOX_TYPE: ${type}`)
    }
}

/**
 * Returns a read-only backend rooted at the package's skills/builtin/ folder.
 * SmartAgent mounts this at /skills/builtin/ via CompositeBackend so the model
 * can read SKILL.md bodies through the standard read_file tool. ReadOnlyBackend
 * prevents the model from mutating package-shipped skill files.
 */
export function getBuiltinSkillsBackend(): BackendProtocol {
    const builtinPath = path.join(__dirname, '..', 'skills', 'builtin')
    return new ReadOnlyBackend(new LocalBackend(builtinPath))
}
