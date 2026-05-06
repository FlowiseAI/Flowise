import { renderHook } from '@testing-library/react'

import type { ExecutionTreeNode, NodeExecutionData } from '@/core/types'

import { useNodeData } from './useNodeData'

// useNodeData transitively imports ChatMessageBubble → NodeContentRenderer,
// which loads ESM-only react-markdown / react-syntax-highlighter. Stub them
// so jest can resolve the module graph; the hook itself reads no React tree.
jest.mock('react-markdown', () => ({ __esModule: true, default: () => null }))
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => null }))
jest.mock('react-syntax-highlighter', () => ({ Prism: () => null }))
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

function makeNode(raw?: Partial<NodeExecutionData> | undefined): ExecutionTreeNode {
    if (!raw) {
        return { id: 'v', nodeId: 'v', nodeLabel: 'v', status: 'FINISHED', name: '', children: [], isVirtualNode: true }
    }
    const rawData: NodeExecutionData = {
        nodeId: 'n1',
        nodeLabel: 'Node',
        status: 'FINISHED',
        previousNodeIds: [],
        data: {},
        ...raw
    }
    return {
        id: rawData.nodeId,
        nodeId: rawData.nodeId,
        nodeLabel: rawData.nodeLabel,
        status: rawData.status,
        name: rawData.name ?? '',
        children: [],
        raw: rawData
    }
}

describe('useNodeData', () => {
    describe('virtual / empty nodes', () => {
        it('handles a virtual node with no `raw` (no crash, all fields default)', () => {
            const { result } = renderHook(() => useNodeData(makeNode()))
            expect(result.current.raw).toBeUndefined()
            expect(result.current.payload).toEqual({})
            expect(result.current.dataInput).toBeUndefined()
            expect(result.current.dataOutput).toBeUndefined()
            expect(result.current.inputMessages).toBeNull()
            expect(result.current.outputConditions).toBeNull()
            expect(result.current.hasInput).toBe(false)
            expect(result.current.hasError).toBe(false)
            expect(result.current.hasState).toBe(false)
            expect(result.current.isHumanInputNode).toBe(false)
            expect(result.current.enableFeedback).toBe(false)
        })

        it('returns hasInput=false for empty data', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: {} })))
            expect(result.current.hasInput).toBe(false)
            expect(result.current.inputValue).toBeUndefined()
        })
    })

    describe('inputValue', () => {
        it('returns data.input.question when present (simple fallback path)', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { input: { question: 'pick one', extra: 'ignored' } } })))
            expect(result.current.inputValue).toBe('pick one')
        })

        it('falls back to the whole data.input when no `question` key exists', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { input: { other: 1 } } })))
            expect(result.current.inputValue).toEqual({ other: 1 })
        })

        it('returns the raw input string when data.input is a primitive', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { input: 'a question' } })))
            expect(result.current.inputValue).toBe('a question')
        })

        it('treats an empty input object as no input (hasInput=false)', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { input: {} } })))
            expect(result.current.hasInput).toBe(false)
        })

        it('suppresses iteration parent input — legacy renders "No data" for iterationAgentflow', () => {
            const { result } = renderHook(() =>
                useNodeData(
                    makeNode({ name: 'iterationAgentflow', data: { name: 'iterationAgentflow', input: { iterationInput: [{}, {}, {}] } } })
                )
            )
            expect(result.current.inputValue).toBeUndefined()
            expect(result.current.hasInput).toBe(false)
        })
    })

    describe('inputMessages (chat detection)', () => {
        it('detects a chat message array at data.input.messages', () => {
            const messages = [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'hi' }
            ]
            const { result } = renderHook(() => useNodeData(makeNode({ data: { input: { messages } } })))
            expect(result.current.inputMessages).toEqual(messages)
            expect(result.current.hasInput).toBe(true)
        })

        it('returns null when data.input.messages is missing or shaped wrong', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { input: { messages: 'nope' } } })))
            expect(result.current.inputMessages).toBeNull()
        })
    })

    describe('outputValue (legacy parity)', () => {
        it('prefers data.output.form over content', () => {
            const form = { fields: { name: 'Ada' } }
            const { result } = renderHook(() => useNodeData(makeNode({ data: { output: { form, content: 'should-not-render' } } })))
            expect(result.current.outputValue).toBe(form)
        })

        it('prefers data.output.http over content', () => {
            const http = { status: 200 }
            const { result } = renderHook(() => useNodeData(makeNode({ data: { output: { http, content: 'should-not-render' } } })))
            expect(result.current.outputValue).toBe(http)
        })

        it('falls through to content when form is empty/falsy (PARITY: truthy check)', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { output: { form: '', content: 'real content' } } })))
            expect(result.current.outputValue).toBe('real content')
        })

        it('returns content when no form/http key exists', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { output: { content: 'just-text' } } })))
            expect(result.current.outputValue).toBe('just-text')
        })

        it('returns undefined when output is an object with no form/http/content', () => {
            // PARITY: legacy treats { nested: ... } as runtime metadata, not user-facing.
            const { result } = renderHook(() => useNodeData(makeNode({ data: { output: { nested: { ok: true } } } })))
            expect(result.current.outputValue).toBeUndefined()
        })

        it('returns the raw value when output is a primitive', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { output: 'hello' } })))
            expect(result.current.outputValue).toBe('hello')
        })

        it('returns undefined when output is null', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { output: null } })))
            expect(result.current.outputValue).toBeUndefined()
        })
    })

    describe('outputConditions', () => {
        it('returns the conditions array when data.output.conditions is shaped right', () => {
            const conditions = [{ type: 'string', operation: 'equal', value1: 'a', value2: 'a', isFulfilled: true }]
            const { result } = renderHook(() => useNodeData(makeNode({ data: { output: { conditions } } })))
            expect(result.current.outputConditions).toEqual(conditions)
        })

        it('returns null when data.output.conditions is missing', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { output: { content: 'x' } } })))
            expect(result.current.outputConditions).toBeNull()
        })

        it('returns null when data.output is not an object', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { output: 'plain' } })))
            expect(result.current.outputConditions).toBeNull()
        })
    })

    describe('error / state flags', () => {
        it('hasError=true when data.error is a non-empty string', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { error: 'Boom' } })))
            expect(result.current.hasError).toBe(true)
            expect(result.current.errorValue).toBe('Boom')
        })

        it('hasError=false when data.error is empty/undefined', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { error: '' } })))
            expect(result.current.hasError).toBe(false)
        })

        it('hasState=true only when data.state is a non-empty object', () => {
            const withKeys = renderHook(() => useNodeData(makeNode({ data: { state: { count: 3 } } })))
            expect(withKeys.result.current.hasState).toBe(true)

            const empty = renderHook(() => useNodeData(makeNode({ data: { state: {} } })))
            expect(empty.result.current.hasState).toBe(false)

            const absent = renderHook(() => useNodeData(makeNode({ data: {} })))
            expect(absent.result.current.hasState).toBe(false)
        })
    })

    describe('HITL fields', () => {
        it('isHumanInputNode is true only for name === "humanInputAgentflow"', () => {
            const yes = renderHook(() => useNodeData(makeNode({ name: 'humanInputAgentflow', data: {} })))
            expect(yes.result.current.isHumanInputNode).toBe(true)

            const no = renderHook(() => useNodeData(makeNode({ name: 'llmAgentflow', data: {} })))
            expect(no.result.current.isHumanInputNode).toBe(false)
        })

        it('isHumanInputNode resolves via data.name (runtime payload shape, no top-level name)', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { name: 'humanInputAgentflow' } })))
            expect(result.current.isHumanInputNode).toBe(true)
        })

        it('enableFeedback reads from data.input.humanInputEnableFeedback', () => {
            const { result } = renderHook(() =>
                useNodeData(makeNode({ data: { input: { question: 'q', humanInputEnableFeedback: true } } }))
            )
            expect(result.current.enableFeedback).toBe(true)
        })

        it('enableFeedback falls back to data.humanInputEnableFeedback for backward compat', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { humanInputEnableFeedback: true } })))
            expect(result.current.enableFeedback).toBe(true)
        })

        it('enableFeedback is false when neither path is set', () => {
            const { result } = renderHook(() => useNodeData(makeNode({ data: { input: { question: 'q' } } })))
            expect(result.current.enableFeedback).toBe(false)
        })
    })
})
