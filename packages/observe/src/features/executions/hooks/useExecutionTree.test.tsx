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

        it('builds node id as nodeId-iterationIndex', () => {
            const node = baseNode({ nodeId: 'n1', iterationIndex: 0 })
            const { result } = renderHook(() => useExecutionTree(toJson([node])))
            expect(result.current[0].id).toBe('n1-0')
        })
    })

    describe('iteration grouping', () => {
        it('inserts a virtual container node for iteration children', () => {
            const parent = baseNode({ nodeId: 'loop', nodeLabel: 'Loop' })
            const child = baseNode({ nodeId: 'step', nodeLabel: 'Step', parentNodeId: 'loop', iterationIndex: 0 })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child])))

            expect(result.current).toHaveLength(1)
            const parentNode = result.current[0]
            expect(parentNode.children).toHaveLength(1)

            const virtualNode = parentNode.children[0]
            expect(virtualNode.isVirtualNode).toBe(true)
            expect(virtualNode.nodeLabel).toBe('Iteration #1')
            expect(virtualNode.id).toBe('loop-iteration-0')
            expect(virtualNode.iterationIndex).toBe(0)
        })

        it('groups children by iterationIndex into separate virtual nodes', () => {
            const parent = baseNode({ nodeId: 'loop', nodeLabel: 'Loop' })
            const iter0a = baseNode({ nodeId: 'step-a', parentNodeId: 'loop', iterationIndex: 0 })
            const iter0b = baseNode({ nodeId: 'step-b', parentNodeId: 'loop', iterationIndex: 0 })
            const iter1a = baseNode({ nodeId: 'step-c', parentNodeId: 'loop', iterationIndex: 1 })
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
            const iter2 = baseNode({ nodeId: 'c', parentNodeId: 'loop', iterationIndex: 2 })
            const iter0 = baseNode({ nodeId: 'a', parentNodeId: 'loop', iterationIndex: 0 })
            const iter1 = baseNode({ nodeId: 'b', parentNodeId: 'loop', iterationIndex: 1 })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, iter2, iter0, iter1])))

            const indices = result.current[0].children.map((c) => c.iterationIndex)
            expect(indices).toEqual([0, 1, 2])
        })

        it('virtual node status matches last child in the iteration group', () => {
            const parent = baseNode({ nodeId: 'loop' })
            const child1 = baseNode({ nodeId: 'c1', parentNodeId: 'loop', iterationIndex: 0, status: 'INPROGRESS' })
            const child2 = baseNode({ nodeId: 'c2', parentNodeId: 'loop', iterationIndex: 0, status: 'ERROR' })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child1, child2])))

            expect(result.current[0].children[0].status).toBe('ERROR')
        })

        it('defaults iterationIndex to 0 when absent', () => {
            const parent = baseNode({ nodeId: 'loop' })
            const child = baseNode({ nodeId: 'c1', parentNodeId: 'loop' })
            // no iterationIndex set
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child])))

            expect(result.current[0].children).toHaveLength(1)
            expect(result.current[0].children[0].iterationIndex).toBe(0)
        })

        it('does not include iteration children as top-level nodes', () => {
            const parent = baseNode({ nodeId: 'loop' })
            const child = baseNode({ nodeId: 'child', parentNodeId: 'loop', iterationIndex: 0 })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child])))

            expect(result.current).toHaveLength(1)
            expect(result.current[0].nodeId).toBe('loop')
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
            const child = baseNode({ nodeId: 'c', parentNodeId: 'loop', iterationIndex: 0 })
            const { result } = renderHook(() => useExecutionTree(toJson([parent, child])))

            const virtualNode = result.current[0].children[0]
            expect(virtualNode.raw).toBeUndefined()
        })
    })
})
