import { renderHook } from '@testing-library/react'

import type { NodeExecutionData } from '@/core/types'

import { useExecutionTree } from './useExecutionTree'

function toJson(nodes: Partial<NodeExecutionData>[]): string {
    return JSON.stringify(nodes)
}

const baseNode = (overrides: Partial<NodeExecutionData> = {}): NodeExecutionData => ({
    nodeId: 'node-1',
    nodeLabel: 'Node 1',
    status: 'FINISHED',
    data: {},
    previousNodeIds: [],
    ...overrides
})

const iterChild = (overrides: Partial<NodeExecutionData> & { parentNodeId?: string; iterationIndex?: number } = {}): NodeExecutionData => {
    const { parentNodeId, iterationIndex, data, ...rest } = overrides
    return baseNode({
        ...rest,
        data: { ...(data ?? {}), parentNodeId, iterationIndex }
    })
}

describe('useExecutionTree', () => {
    describe('degenerate inputs', () => {
        it('returns [] for null', () => {
            const { result } = renderHook(() => useExecutionTree(null))
            expect(result.current).toEqual([])
        })

        it('returns [] for empty string', () => {
            const { result } = renderHook(() => useExecutionTree(''))
            expect(result.current).toEqual([])
        })

        it('returns [] for invalid JSON', () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
            const { result } = renderHook(() => useExecutionTree('{not valid json'))
            expect(result.current).toEqual([])
            expect(consoleError).toHaveBeenCalledWith('[Observe] Failed to parse executionData JSON')
            consoleError.mockRestore()
        })

        it('returns [] for non-array JSON', () => {
            const { result } = renderHook(() => useExecutionTree('{"foo":"bar"}'))
            expect(result.current).toEqual([])
        })

        it('returns [] for empty array', () => {
            const { result } = renderHook(() => useExecutionTree('[]'))
            expect(result.current).toEqual([])
        })
    })

    describe('top-level nodes', () => {
        it('returns a single node with empty children', () => {
            const node = baseNode({ nodeId: 'n1', nodeLabel: 'Step 1' })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            expect(result.current).toHaveLength(1)
            expect(result.current[0].nodeId).toBe('n1')
            expect(result.current[0].nodeLabel).toBe('Step 1')
            expect(result.current[0].children).toEqual([])
        })

        it('returns multiple top-level nodes in order', () => {
            const nodes = [
                baseNode({ nodeId: 'n1', nodeLabel: 'A' }),
                baseNode({ nodeId: 'n2', nodeLabel: 'B' }),
                baseNode({ nodeId: 'n3', nodeLabel: 'C' })
            ]
            const { result } = renderHook(() => useExecutionTree(toJson(nodes)))
            expect(result.current.map((n) => n.nodeId)).toEqual(['n1', 'n2', 'n3'])
        })

        it('builds node id as nodeId_<arrayIndex> so duplicate nodeIds stay addressable', () => {
            const node = baseNode({ nodeId: 'n1' })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            expect(result.current[0].id).toBe('n1_0')
        })

        it('uses array index in the id when the same nodeId appears twice (e.g., a re-run)', () => {
            const a = baseNode({ nodeId: 'shared', nodeLabel: 'First' })
            const b = baseNode({ nodeId: 'shared', nodeLabel: 'Second' })
            const { result } = renderHook(() => useExecutionTree(toJson([a, b])))
            // Both instances are distinct in the tree; ids are unique even though nodeId collides.
            const ids = result.current.map((n) => n.id)
            expect(ids).toEqual(['shared_0', 'shared_1'])
        })
    })

    describe('previousNodeIds parenting', () => {
        it('attaches a node to the most recent ancestor whose nodeId is in previousNodeIds', () => {
            const start = baseNode({ nodeId: 'startAgentflow_0', nodeLabel: 'Start' })
            const next = baseNode({ nodeId: 'executeFlowAgentflow_1', nodeLabel: 'Execute Flow 0', previousNodeIds: ['startAgentflow_0'] })
            const { result } = renderHook(() => useExecutionTree(toJson([start, next])))

            expect(result.current).toHaveLength(1)
            expect(result.current[0].nodeId).toBe('startAgentflow_0')
            expect(result.current[0].children).toHaveLength(1)
            expect(result.current[0].children[0].nodeId).toBe('executeFlowAgentflow_1')
        })

        it('chains A → B → C through previousNodeIds', () => {
            const a = baseNode({ nodeId: 'a' })
            const b = baseNode({ nodeId: 'b', previousNodeIds: ['a'] })
            const c = baseNode({ nodeId: 'c', previousNodeIds: ['b'] })
            const { result } = renderHook(() => useExecutionTree(toJson([a, b, c])))

            expect(result.current).toHaveLength(1)
            expect(result.current[0].nodeId).toBe('a')
            expect(result.current[0].children[0].nodeId).toBe('b')
            expect(result.current[0].children[0].children[0].nodeId).toBe('c')
        })

        it('treats a node as root when previousNodeIds names something not yet executed', () => {
            const orphan = baseNode({ nodeId: 'orphan', previousNodeIds: ['never-ran'] })
            const { result } = renderHook(() => useExecutionTree(toJson([orphan])))
            expect(result.current).toHaveLength(1)
            expect(result.current[0].nodeId).toBe('orphan')
        })

        it('picks the most recent instance when previousNodeIds resolves to a duplicate', () => {
            // Two instances of "loop" appear; the next node points back to the loop.
            // Only the most recent (latest array index) instance should adopt the child.
            const first = baseNode({ nodeId: 'loop', nodeLabel: 'Loop pass 1' })
            const middle = baseNode({ nodeId: 'mid' })
            const second = baseNode({ nodeId: 'loop', nodeLabel: 'Loop pass 2' })
            const child = baseNode({ nodeId: 'after', previousNodeIds: ['loop'] })
            const { result } = renderHook(() => useExecutionTree(toJson([first, middle, second, child])))

            const second_loop = result.current.find((n) => n.id === 'loop_2')
            expect(second_loop?.children[0]?.nodeId).toBe('after')
            const first_loop = result.current.find((n) => n.id === 'loop_0')
            expect(first_loop?.children).toHaveLength(0)
        })
    })

    describe('iteration grouping', () => {
        it('inserts a virtual container node for iteration children', () => {
            const parent = baseNode({ nodeId: 'loop', nodeLabel: 'Loop' })
            const child = iterChild({ nodeId: 'step', nodeLabel: 'Step', parentNodeId: 'loop', iterationIndex: 0 })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child])))

            expect(result.current).toHaveLength(1)
            const parentNode = result.current[0]
            expect(parentNode.children).toHaveLength(1)

            const virtualNode = parentNode.children[0]
            expect(virtualNode.isVirtualNode).toBe(true)
            // PARITY: legacy uses the raw 0-based iterationIndex.
            expect(virtualNode.nodeLabel).toBe('Iteration #0')
            expect(virtualNode.id).toBe('loop-iteration-0')
            expect(virtualNode.iterationIndex).toBe(0)
            // PARITY: virtual containers must carry `name: 'iterationAgentflow'`
            // so the AGENTFLOW_ICONS lookup in the sidebar resolves to the
            // iteration icon. Asserted at the hook layer so the contract is
            // independent of the rendered icon.
            expect(virtualNode.name).toBe('iterationAgentflow')
        })

        it('groups children by iterationIndex into separate virtual nodes', () => {
            const parent = baseNode({ nodeId: 'loop', nodeLabel: 'Loop' })
            const iter0a = iterChild({ nodeId: 'step-a', parentNodeId: 'loop', iterationIndex: 0 })
            const iter0b = iterChild({ nodeId: 'step-b', parentNodeId: 'loop', iterationIndex: 0 })
            const iter1a = iterChild({ nodeId: 'step-c', parentNodeId: 'loop', iterationIndex: 1 })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, iter0a, iter0b, iter1a])))

            const children = result.current[0].children
            expect(children).toHaveLength(2)
            expect(children[0].iterationIndex).toBe(0)
            expect(children[0].children).toHaveLength(2)
            expect(children[1].iterationIndex).toBe(1)
            expect(children[1].children).toHaveLength(1)
        })

        it('sorts virtual nodes by iterationIndex ascending', () => {
            const parent = baseNode({ nodeId: 'loop' })
            const iter2 = iterChild({ nodeId: 'c', parentNodeId: 'loop', iterationIndex: 2 })
            const iter0 = iterChild({ nodeId: 'a', parentNodeId: 'loop', iterationIndex: 0 })
            const iter1 = iterChild({ nodeId: 'b', parentNodeId: 'loop', iterationIndex: 1 })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, iter2, iter0, iter1])))

            const indices = result.current[0].children.map((c) => c.iterationIndex)
            expect(indices).toEqual([0, 1, 2])
        })

        it('rolls up virtual node status to ERROR when any child errored', () => {
            const parent = baseNode({ nodeId: 'loop' })
            const child1 = iterChild({ nodeId: 'c1', parentNodeId: 'loop', iterationIndex: 0, status: 'FINISHED' })
            const child2 = iterChild({ nodeId: 'c2', parentNodeId: 'loop', iterationIndex: 0, status: 'ERROR' })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child1, child2])))

            expect(result.current[0].children[0].status).toBe('ERROR')
        })

        it('rolls up to INPROGRESS when any child is in-flight (and none errored)', () => {
            const parent = baseNode({ nodeId: 'loop' })
            const child1 = iterChild({ nodeId: 'c1', parentNodeId: 'loop', iterationIndex: 0, status: 'INPROGRESS' })
            const child2 = iterChild({ nodeId: 'c2', parentNodeId: 'loop', iterationIndex: 0, status: 'FINISHED' })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child1, child2])))

            expect(result.current[0].children[0].status).toBe('INPROGRESS')
        })

        it('rolls up to FINISHED only when all children finished', () => {
            const parent = baseNode({ nodeId: 'loop' })
            const child1 = iterChild({ nodeId: 'c1', parentNodeId: 'loop', iterationIndex: 0, status: 'FINISHED' })
            const child2 = iterChild({ nodeId: 'c2', parentNodeId: 'loop', iterationIndex: 0, status: 'FINISHED' })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child1, child2])))

            expect(result.current[0].children[0].status).toBe('FINISHED')
        })

        it('falls back to UNKNOWN when children mix non-error, non-in-flight, non-finished states (legacy parity)', () => {
            const parent = baseNode({ nodeId: 'loop' })
            // Mix STOPPED + TIMEOUT — neither triggers ERROR / INPROGRESS, and "every === FINISHED" is false.
            const child1 = iterChild({ nodeId: 'c1', parentNodeId: 'loop', iterationIndex: 0, status: 'STOPPED' })
            const child2 = iterChild({ nodeId: 'c2', parentNodeId: 'loop', iterationIndex: 0, status: 'TIMEOUT' })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child1, child2])))

            expect(result.current[0].children[0].status).toBe('UNKNOWN')
        })

        it('treats a node with parentNodeId but no iterationIndex as a non-iteration node (legacy parity)', () => {
            // PARITY: legacy buildTreeData gates iteration grouping on
            // `data.parentNodeId && data.iterationIndex !== undefined`.
            // Without iterationIndex, the node falls back to previousNodeIds
            // / root behavior — it does NOT join an iteration group.
            const parent = baseNode({ nodeId: 'loop' })
            const orphan = iterChild({ nodeId: 'c1', parentNodeId: 'loop' })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, orphan])))

            // Both are roots; no virtual iteration container is synthesized.
            expect(result.current).toHaveLength(2)
            expect(result.current[0].children).toHaveLength(0)
        })

        it('does not include iteration children as top-level nodes', () => {
            const parent = baseNode({ nodeId: 'loop' })
            const child = iterChild({ nodeId: 'child', parentNodeId: 'loop', iterationIndex: 0 })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child])))

            expect(result.current).toHaveLength(1)
            expect(result.current[0].nodeId).toBe('loop')
        })
    })

    describe('iteration-internal previousNodeIds (third pass)', () => {
        // PARITY: the trickiest part of the port — building the sub-tree
        // INSIDE a virtual iteration container. Sibling chains within a
        // single iteration must form, but the lookup must not adopt
        // ancestors from a different iteration (or from outside the
        // iteration entirely).
        it('chains iteration-internal siblings via previousNodeIds within the same iteration', () => {
            const loop = baseNode({ nodeId: 'loop' })
            const a = iterChild({ nodeId: 'a', parentNodeId: 'loop', iterationIndex: 0 })
            const b = iterChild({ nodeId: 'b', parentNodeId: 'loop', iterationIndex: 0, previousNodeIds: ['a'] })
            const c = iterChild({ nodeId: 'c', parentNodeId: 'loop', iterationIndex: 0, previousNodeIds: ['b'] })
            const { result } = renderHook(() => useExecutionTree(toJson([loop, a, b, c])))

            // Tree: loop -> [iter#0]
            //                 └─ a
            //                    └─ b
            //                       └─ c
            const virtualNode = result.current[0].children[0]
            expect(virtualNode.isVirtualNode).toBe(true)
            expect(virtualNode.children).toHaveLength(1)
            expect(virtualNode.children[0].nodeId).toBe('a')
            expect(virtualNode.children[0].children).toHaveLength(1)
            expect(virtualNode.children[0].children[0].nodeId).toBe('b')
            expect(virtualNode.children[0].children[0].children).toHaveLength(1)
            expect(virtualNode.children[0].children[0].children[0].nodeId).toBe('c')
        })

        it('does not adopt ancestors from a different iteration when resolving previousNodeIds', () => {
            // Two iterations of the same loop. Iteration #1 has a node whose
            // previousNodeIds points at a nodeId that exists in BOTH
            // iterations. The third-pass `findAncestor(sameIterationOnly=true)`
            // must restrict the match to iteration #1, otherwise iter#1's
            // node would dangle as a child of iter#0.
            const loop = baseNode({ nodeId: 'loop' })
            const iter0a = iterChild({ nodeId: 'a', parentNodeId: 'loop', iterationIndex: 0 })
            const iter0b = iterChild({ nodeId: 'b', parentNodeId: 'loop', iterationIndex: 0, previousNodeIds: ['a'] })
            const iter1a = iterChild({ nodeId: 'a', parentNodeId: 'loop', iterationIndex: 1 })
            const iter1b = iterChild({ nodeId: 'b', parentNodeId: 'loop', iterationIndex: 1, previousNodeIds: ['a'] })
            const { result } = renderHook(() => useExecutionTree(toJson([loop, iter0a, iter0b, iter1a, iter1b])))

            const virtuals = result.current[0].children
            expect(virtuals).toHaveLength(2)

            const iter0 = virtuals.find((v) => v.iterationIndex === 0)!
            const iter1 = virtuals.find((v) => v.iterationIndex === 1)!

            // Each iteration owns exactly one root child (`a`) with `b` underneath it.
            expect(iter0.children).toHaveLength(1)
            expect(iter0.children[0].nodeId).toBe('a')
            expect(iter0.children[0].children).toHaveLength(1)
            expect(iter0.children[0].children[0].nodeId).toBe('b')

            expect(iter1.children).toHaveLength(1)
            expect(iter1.children[0].nodeId).toBe('a')
            expect(iter1.children[0].children).toHaveLength(1)
            expect(iter1.children[0].children[0].nodeId).toBe('b')
        })

        it('falls back to virtual container when previousNodeIds points outside the iteration', () => {
            // An iteration child references a nodeId that exists OUTSIDE the
            // iteration (a top-level node). Because `findAncestor` with
            // sameIterationOnly=true excludes non-iteration candidates, no
            // ancestor is found and the node attaches to the virtual
            // container directly — preserving legacy behavior.
            const loop = baseNode({ nodeId: 'loop' })
            const outside = baseNode({ nodeId: 'outside' })
            const inside = iterChild({ nodeId: 'inside', parentNodeId: 'loop', iterationIndex: 0, previousNodeIds: ['outside'] })
            const { result } = renderHook(() => useExecutionTree(toJson([loop, outside, inside])))

            const virtualNode = result.current.find((n) => n.nodeId === 'loop')!.children[0]
            expect(virtualNode.isVirtualNode).toBe(true)
            expect(virtualNode.children).toHaveLength(1)
            expect(virtualNode.children[0].nodeId).toBe('inside')
        })

        it('reads parentNodeId/iterationIndex from data (runtime payload shape, not top-level)', () => {
            const start = baseNode({ nodeId: 'start' })
            const llm = baseNode({ nodeId: 'llm', previousNodeIds: ['start'] })
            const loop = baseNode({ nodeId: 'loop', previousNodeIds: ['llm'] })
            const iter0Agent = iterChild({ nodeId: 'agent', parentNodeId: 'loop', iterationIndex: 0 })
            const iter0Reply = iterChild({ nodeId: 'reply', parentNodeId: 'loop', iterationIndex: 0, previousNodeIds: ['agent'] })
            const iter1Agent = iterChild({ nodeId: 'agent', parentNodeId: 'loop', iterationIndex: 1 })
            const iter1Reply = iterChild({ nodeId: 'reply', parentNodeId: 'loop', iterationIndex: 1, previousNodeIds: ['agent'] })
            const iter2Agent = iterChild({ nodeId: 'agent', parentNodeId: 'loop', iterationIndex: 2 })
            const iter2Reply = iterChild({ nodeId: 'reply', parentNodeId: 'loop', iterationIndex: 2, previousNodeIds: ['agent'] })
            const { result } = renderHook(() =>
                useExecutionTree(toJson([start, llm, loop, iter0Agent, iter0Reply, iter1Agent, iter1Reply, iter2Agent, iter2Reply]))
            )

            expect(result.current).toHaveLength(1)
            const llmNode = result.current[0].children[0]
            const loopNode = llmNode.children[0]
            expect(loopNode.nodeId).toBe('loop')
            expect(loopNode.children).toHaveLength(3)

            loopNode.children.forEach((virtual, i) => {
                expect(virtual.isVirtualNode).toBe(true)
                expect(virtual.iterationIndex).toBe(i)
                expect(virtual.children).toHaveLength(1)
                expect(virtual.children[0].nodeId).toBe('agent')
                expect(virtual.children[0].children).toHaveLength(1)
                expect(virtual.children[0].children[0].nodeId).toBe('reply')
            })
        })
    })

    describe('resolved node name (drives icon lookup)', () => {
        it('uses the top-level n.name when present', () => {
            const node = baseNode({ nodeId: 'agentAgentflow_0', name: 'agentAgentflow' })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            expect(result.current[0].name).toBe('agentAgentflow')
        })

        it('falls back to data.name when n.name is absent (runtime never emits n.name)', () => {
            // Per IAgentflowExecutedData, the runtime emits the type identifier
            // at `data.name`, not the top level. The detail header + tree icons
            // both rely on this fallback to look up the right AGENTFLOW_ICONS entry.
            const node = baseNode({ nodeId: 'llmAgentflow_0', data: { name: 'llmAgentflow' } })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            expect(result.current[0].name).toBe('llmAgentflow')
        })

        it('falls back to nodeId.split("_")[0] when neither name source is present', () => {
            const node = baseNode({ nodeId: 'startAgentflow_42' })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            expect(result.current[0].name).toBe('startAgentflow')
        })

        it('prefers n.name over data.name when both are present', () => {
            const node = baseNode({ nodeId: 'x_0', name: 'fromTop', data: { name: 'fromData' } })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            expect(result.current[0].name).toBe('fromTop')
        })

        it('ignores a non-string data.name value', () => {
            // If the runtime payload is malformed (e.g. data.name accidentally
            // set to an object), we must not pass that through as a name —
            // the nodeId fallback must kick in instead.
            // Cast through unknown — the test deliberately violates the typed contract.
            const node = baseNode({ nodeId: 'fallback_0', data: { name: { nested: 'oops' } as unknown as string } })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            expect(result.current[0].name).toBe('fallback')
        })
    })

    describe('iterations-first sibling sort', () => {
        // PARITY: legacy ExecutionDetails.jsx:589-614 sorts every node's
        // children so virtual iteration nodes come first; non-iteration
        // siblings preserve original execution order.
        it('places virtual iteration siblings before non-iteration siblings of the same parent', () => {
            const start = baseNode({ nodeId: 'start' })
            // An iteration-agent node hanging off `start` …
            const iterAgent = baseNode({ nodeId: 'loop', previousNodeIds: ['start'] })
            // … with one iteration child …
            const iterationChild = iterChild({ nodeId: 'inside', parentNodeId: 'loop', iterationIndex: 0 })
            // … plus a plain sibling under `start` that records execution AFTER the iteration.
            // (`previousNodeIds: ['start']` means it would attach to start as a sibling of `loop`.)
            const sibling = baseNode({ nodeId: 'after', previousNodeIds: ['start'] })
            const { result } = renderHook(() => useExecutionTree(toJson([start, iterAgent, iterationChild, sibling])))

            const startNode = result.current[0]
            // Children of `start`: `loop` (which holds the virtual iteration node) and `after`.
            // Within `loop`, the virtual iteration node should sort first vs any plain children.
            // Within `start`, ordering preserves execution order between non-iteration siblings.
            const loopNode = startNode.children.find((c) => c.nodeId === 'loop')!
            expect(loopNode.children[0].isVirtualNode).toBe(true)
        })

        it('preserves original execution order between non-iteration siblings', () => {
            const root = baseNode({ nodeId: 'root' })
            const childA = baseNode({ nodeId: 'a', previousNodeIds: ['root'] })
            const childB = baseNode({ nodeId: 'b', previousNodeIds: ['root'] })
            const childC = baseNode({ nodeId: 'c', previousNodeIds: ['root'] })
            const { result } = renderHook(() => useExecutionTree(toJson([root, childA, childB, childC])))

            const ids = result.current[0].children.map((n) => n.nodeId)
            expect(ids).toEqual(['a', 'b', 'c'])
        })
    })

    describe('credential redaction', () => {
        // PARITY: legacy buildTreeData (ExecutionDetails.jsx:371-383) recursively
        // strips `FLOWISE_CREDENTIAL_ID` keys from each node's `data` because the
        // server-side list/detail endpoints don't redact (only the public
        // endpoint does). The hook does the scrubbing client-side.
        it('removes top-level FLOWISE_CREDENTIAL_ID keys from raw.data', () => {
            const node = baseNode({ nodeId: 'n1', data: { FLOWISE_CREDENTIAL_ID: 'secret', other: 'kept' } })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            const raw = result.current[0].raw!
            expect((raw.data as Record<string, unknown>).FLOWISE_CREDENTIAL_ID).toBeUndefined()
            expect((raw.data as Record<string, unknown>).other).toBe('kept')
        })

        it('removes nested FLOWISE_CREDENTIAL_ID keys recursively', () => {
            const node = baseNode({
                nodeId: 'n1',
                data: { input: { credentials: { FLOWISE_CREDENTIAL_ID: 'secret', label: 'kept' } } }
            })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            const raw = result.current[0].raw!
            const credentials = ((raw.data as Record<string, unknown>).input as Record<string, unknown>).credentials as Record<
                string,
                unknown
            >
            expect(credentials.FLOWISE_CREDENTIAL_ID).toBeUndefined()
            expect(credentials.label).toBe('kept')
        })
    })

    describe('raw node reference', () => {
        it('attaches the original NodeExecutionData as raw on leaf nodes', () => {
            const node = baseNode({ nodeId: 'n1', nodeLabel: 'Step' })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            expect(result.current[0].raw).toMatchObject({ nodeId: 'n1', nodeLabel: 'Step' })
        })

        it('does not set raw on virtual iteration container nodes', () => {
            const parent = baseNode({ nodeId: 'loop' })
            const child = iterChild({ nodeId: 'c', parentNodeId: 'loop', iterationIndex: 0 })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child])))

            const virtualNode = result.current[0].children[0]
            expect(virtualNode.raw).toBeUndefined()
        })
    })
})
