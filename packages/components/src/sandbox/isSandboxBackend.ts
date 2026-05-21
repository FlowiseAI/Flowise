/**
 * Sandbox — structural capability detection.
 *
 * A pure type guard with no dependence on class hierarchies. Per
 * `docs/BASH_EXECUTION_ARCHITECTURE.md` §3.6, structural typing is
 * essential because backends may come from adapters, composites, or
 * proxies, and `instanceof` checks would be brittle.
 */

import { SandboxBackendProtocol } from './types'

export const isSandboxBackend = (value: unknown): value is SandboxBackendProtocol => {
    if (value == null || typeof value !== 'object') return false
    const v = value as Record<string, unknown>
    if (typeof v.id !== 'string' || v.id === '') return false
    if (typeof v.execute !== 'function') return false
    return true
}
