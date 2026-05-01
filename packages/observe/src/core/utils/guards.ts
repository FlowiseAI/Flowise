import type { AvailableToolEntry, ChatMessage, ConditionEntry, UsedToolEntry } from '@/core/types'

/**
 * Domain-aware type guards used across NodeExecutionDetail and useNodeData
 * to decide which sub-renderer to dispatch for `data.input.messages`,
 * `data.output.conditions`, `data.output.availableTools`, and
 * `data.output.usedTools`. Live in core/utils since they understand the
 * shape of the runtime payload.
 */

export function isChatMessageArray(value: unknown): value is ChatMessage[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((m) => m !== null && typeof m === 'object' && !Array.isArray(m) && 'role' in (m as Record<string, unknown>))
    )
}

export function isConditionArray(value: unknown): value is ConditionEntry[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((c) => c !== null && typeof c === 'object' && !Array.isArray(c) && 'isFulfilled' in (c as Record<string, unknown>))
    )
}

export function isAvailableToolArray(value: unknown): value is AvailableToolEntry[] {
    return Array.isArray(value) && value.length > 0 && value.every((t) => t !== null && typeof t === 'object' && !Array.isArray(t))
}

export function isUsedToolArray(value: unknown): value is UsedToolEntry[] {
    return Array.isArray(value) && value.length > 0 && value.every((t) => t !== null && typeof t === 'object' && !Array.isArray(t))
}
