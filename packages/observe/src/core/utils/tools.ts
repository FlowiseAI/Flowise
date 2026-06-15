import type { AvailableToolEntry, NormalizedToolCall } from '@/core/types'

/**
 * Resolves a tool reference (typically `message.name` or a tool_call function
 * name) against the runtime's `availableTools` list, falling back to the raw
 * name for both icon lookup and display label when no match is found.
 */
export function resolveTool(name: string, availableTools: AvailableToolEntry[] | undefined): { iconName: string; label: string } {
    const matching = availableTools?.find((t) => t.name === name)
    return {
        iconName: matching?.toolNode?.name ?? name,
        label: matching?.toolNode?.label ?? name
    }
}

function isFunctionCallItem(item: unknown): boolean {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return false
    const rec = item as Record<string, unknown>
    return rec.type === 'functionCall' && rec.functionCall !== null && typeof rec.functionCall === 'object'
}

/**
 * Tool calls arrive in two shapes: OpenAI-style `message.tool_calls`, or
 * Gemini-style `message.content` of `{ type: 'functionCall', functionCall }`.
 * `suppressContent` tells the caller to hide the content dump when it carries
 * the same data as the accordions (some providers send both shapes at once).
 */
export function extractToolCalls(message: { tool_calls?: unknown; content?: unknown }): {
    calls: NormalizedToolCall[]
    suppressContent: boolean
} {
    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
        const calls = message.tool_calls
            .filter((c): c is Record<string, unknown> => c !== null && typeof c === 'object' && !Array.isArray(c))
            .map((c) => ({
                raw: c,
                name: typeof c.name === 'string' ? c.name : 'Tool Call'
            }))
        const contentIsAllFunctionCalls =
            Array.isArray(message.content) && message.content.length > 0 && message.content.every(isFunctionCallItem)
        return { calls, suppressContent: contentIsAllFunctionCalls }
    }

    if (Array.isArray(message.content) && message.content.length > 0) {
        const calls: NormalizedToolCall[] = []
        for (const item of message.content) {
            if (!isFunctionCallItem(item)) continue
            const rec = item as Record<string, unknown>
            const fc = rec.functionCall as Record<string, unknown>
            calls.push({
                raw: rec,
                name: typeof fc.name === 'string' ? fc.name : 'Tool Call'
            })
        }
        // Mixed content (text + functionCalls) keeps the text portion visible.
        if (calls.length > 0 && calls.length === message.content.length) {
            return { calls, suppressContent: true }
        }
        return { calls, suppressContent: false }
    }

    return { calls: [], suppressContent: false }
}
