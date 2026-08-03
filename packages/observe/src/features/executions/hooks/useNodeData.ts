import { useMemo } from 'react'

import type { ChatMessage, ConditionEntry, ExecutionTreeNode, NodeExecutionData, NodeExecutionOutput } from '@/core/types'
import { isChatMessageArray, isConditionArray } from '@/core/utils'

/** Narrows an unknown to a non-array object record, or undefined otherwise. */
function asObjectRecord<T extends Record<string, unknown> = Record<string, unknown>>(value: unknown): T | undefined {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as T) : undefined
}

export interface DerivedNodeData {
    /** Raw node data (or undefined for virtual iteration nodes). */
    raw: NodeExecutionData | undefined
    /** Whole `data` payload, defaulted to {}. */
    payload: Record<string, unknown>
    /** `data.output` as a record (used for metrics + content selection). */
    dataOutput: NodeExecutionOutput | undefined
    /** `data.input` as a record. */
    dataInput: Record<string, unknown> | undefined
    /** Chat-style message array if `data.input.messages` is one, else null. */
    inputMessages: ChatMessage[] | null
    /** Curated input value: `data.input.question` if present, else `data.input`. */
    inputValue: unknown
    /** Curated output value: `output.form` | `output.http` | `output.content`. */
    outputValue: unknown
    /**
     * Condition-node output (`data.output.conditions`) when present. Rendered
     * as success-bordered "Fulfilled" boxes instead of through the generic
     * content renderer. Mirrors legacy `renderFullfilledConditions`.
     */
    outputConditions: ConditionEntry[] | null
    errorValue: unknown
    stateValue: unknown
    hasInput: boolean
    hasError: boolean
    hasState: boolean
    /**
     * Whether this is the special HITL node — `name === 'humanInputAgentflow'`.
     */
    isHumanInputNode: boolean
    /**
     * Whether the runtime requested the optional feedback dialog before the
     * proceed/reject submission. Stored at `data.input.humanInputEnableFeedback`
     * with backward-compat fallback to `data.humanInputEnableFeedback`.
     */
    enableFeedback: boolean
}

/**
 * Derive the curated values used by `NodeExecutionDetail` from a tree node.
 * Encapsulates the legacy parity rules:
 *
 *  - Input: chat-style nodes (Agent / LLM) put a message history at
 *    `data.input.messages`. Otherwise prefer the simple `question` field,
 *    falling back to the raw input value.
 *  - Output: prefer `data.output.form` → `data.output.http` →
 *    `data.output.content`. Other output keys (timeMetadata, usageMetadata,
 *    usedTools, ...) are metadata, not user-facing content.
 *  - Empty objects in input fall back to "No data" placeholder rather than
 *    a `root: {}` JSON dump.
 */
export function useNodeData(node: ExecutionTreeNode): DerivedNodeData {
    return useMemo(() => {
        const raw = node.raw as NodeExecutionData | undefined
        const payload = (raw?.data ?? {}) as Record<string, unknown>

        const dataOutput = asObjectRecord<NodeExecutionOutput>(payload.output)
        const dataInput = asObjectRecord(payload.input)

        const inputMessages: ChatMessage[] | null = (() => {
            const messages = (payload.input as Record<string, unknown> | undefined)?.messages
            return isChatMessageArray(messages) ? messages : null
        })()

        const inputValue: unknown = (() => {
            const input = payload.input
            if (input === null || input === undefined) return undefined
            if (typeof input === 'object' && !Array.isArray(input) && 'question' in (input as Record<string, unknown>)) {
                return (input as Record<string, unknown>).question
            }
            // Iteration parent: legacy's fallback renders `data.input.question || '*No data*'`,
            // and the runtime emits `data.input.iterationInput` (no `question`) → "No data".
            if (payload.name === 'iterationAgentflow') return undefined
            return input
        })()

        const outputConditions: ConditionEntry[] | null = (() => {
            const out = payload.output
            if (out === null || typeof out !== 'object' || Array.isArray(out)) return null
            const conditions = (out as Record<string, unknown>).conditions
            return isConditionArray(conditions) ? conditions : null
        })()

        const outputValue: unknown = (() => {
            const out = payload.output
            if (out === null || out === undefined) return undefined
            if (typeof out === 'object' && !Array.isArray(out)) {
                const o = out as Record<string, unknown>
                // PARITY: truthy check (not `!= null`). With `form: ''` or
                // `http: 0`, legacy falls through to content — matching that
                // avoids an empty/zero placeholder over the real payload.
                if (o.form) return o.form
                if (o.http) return o.http
                return o.content ?? undefined
            }
            return out
        })()

        const errorValue: unknown = payload.error
        const stateValue: unknown = payload.state

        const isEmptyObject =
            inputValue !== null &&
            typeof inputValue === 'object' &&
            !Array.isArray(inputValue) &&
            Object.keys(inputValue as Record<string, unknown>).length === 0
        const hasInput = inputMessages !== null || (inputValue !== undefined && inputValue !== null && inputValue !== '' && !isEmptyObject)
        const hasError = errorValue !== undefined && errorValue !== null && errorValue !== ''
        const hasState =
            stateValue !== undefined &&
            stateValue !== null &&
            typeof stateValue === 'object' &&
            Object.keys(stateValue as Record<string, unknown>).length > 0

        // Same fallback chain as the tree builder: the runtime emits the type
        // identifier on `data.name`, not at the top level.
        const dataName = raw?.data?.name
        const resolvedName = raw?.name ?? (typeof dataName === 'string' ? dataName : undefined)
        const isHumanInputNode = resolvedName === 'humanInputAgentflow'
        const enableFeedback = dataInput?.humanInputEnableFeedback === true || payload.humanInputEnableFeedback === true

        return {
            raw,
            payload,
            dataOutput,
            dataInput,
            inputMessages,
            inputValue,
            outputValue,
            outputConditions,
            errorValue,
            stateValue,
            hasInput,
            hasError,
            hasState,
            isHumanInputNode,
            enableFeedback
        }
    }, [node])
}
