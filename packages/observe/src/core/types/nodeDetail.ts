/**
 * Domain types shared across the node-detail rendering surface
 * (NodeExecutionDetail + ChatMessageBubble + tool/condition components +
 * useNodeData hook). Lifted out of their owning components so the hook
 * doesn't have to import upward into sibling component files.
 */

export interface ChatMessage {
    role?: string
    name?: string
    content?: unknown
    tool_calls?: unknown
    tool_call_id?: string
    additional_kwargs?: {
        usedTools?: UsedToolEntry[]
    }
}

export interface ToolNodeRef {
    name?: string
    label?: string
}

export interface AvailableToolEntry {
    name?: string
    toolNode?: ToolNodeRef
    [key: string]: unknown
}

export interface UsedToolRef {
    tool?: string
    [key: string]: unknown
}

export interface UsedToolEntry {
    tool?: string
    error?: unknown
    [key: string]: unknown
}

export interface NormalizedToolCall {
    raw: unknown
    name: string
}

export interface ConditionEntry {
    type?: string
    operation?: string
    value1?: unknown
    value2?: unknown
    isFulfilled?: boolean
    [key: string]: unknown
}
