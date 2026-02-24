import { ReactNode } from 'react'

import { makeFlowEdge, makeFlowNode } from '@test-utils/factories'
import { act, renderHook } from '@testing-library/react'

import type { FlowData } from '@/core/types'

import { AgentflowStateProvider, useAgentflowContext } from './AgentflowContext'

const makeNode = (id: string, type = 'agentFlow') => makeFlowNode(id, { type })
const makeEdge = makeFlowEdge

// Wrapper component for testing
const createWrapper = (initialFlow?: FlowData) => {
    function Wrapper({ children }: { children: ReactNode }) {
        return <AgentflowStateProvider initialFlow={initialFlow}>{children}</AgentflowStateProvider>
    }
    return Wrapper
}

describe('AgentflowContext - deleteNode', () => {
    it('should remove node from the nodes array', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2'), makeNode('node-3')],
            edges: []
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Initial state should have 3 nodes
        expect(result.current.state.nodes).toHaveLength(3)
        expect(result.current.state.nodes.map((n) => n.id)).toEqual(['node-1', 'node-2', 'node-3'])

        // Delete node-2
        act(() => {
            result.current.deleteNode('node-2')
        })

        // Should have 2 nodes remaining
        expect(result.current.state.nodes).toHaveLength(2)
        expect(result.current.state.nodes.map((n) => n.id)).toEqual(['node-1', 'node-3'])
        expect(result.current.state.nodes.find((n) => n.id === 'node-2')).toBeUndefined()
    })

    it('should remove connected edges when node is deleted', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2'), makeNode('node-3'), makeNode('node-4')],
            edges: [
                makeEdge('node-1', 'node-2', { id: 'edge-1-2' }),
                makeEdge('node-2', 'node-3', { id: 'edge-2-3' }),
                makeEdge('node-3', 'node-4', { id: 'edge-3-4' })
            ]
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Initial state should have 3 edges
        expect(result.current.state.edges).toHaveLength(3)

        // Delete node-2 (which is connected to node-1 and node-3)
        act(() => {
            result.current.deleteNode('node-2')
        })

        // Should remove edges where node-2 is source or target
        expect(result.current.state.edges).toHaveLength(1)
        expect(result.current.state.edges[0].id).toBe('edge-3-4')
        expect(result.current.state.edges.find((e) => e.id === 'edge-1-2')).toBeUndefined()
        expect(result.current.state.edges.find((e) => e.id === 'edge-2-3')).toBeUndefined()
    })

    it('should remove edges where deleted node is the source', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2'), makeNode('node-3')],
            edges: [makeEdge('node-1', 'node-2', { id: 'edge-1-2' }), makeEdge('node-1', 'node-3', { id: 'edge-1-3' })]
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        expect(result.current.state.edges).toHaveLength(2)

        // Delete node-1 (which is the source for both edges)
        act(() => {
            result.current.deleteNode('node-1')
        })

        // All edges from node-1 should be removed
        expect(result.current.state.edges).toHaveLength(0)
    })

    it('should remove edges where deleted node is the target', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2'), makeNode('node-3')],
            edges: [makeEdge('node-1', 'node-3', { id: 'edge-1-3' }), makeEdge('node-2', 'node-3', { id: 'edge-2-3' })]
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        expect(result.current.state.edges).toHaveLength(2)

        // Delete node-3 (which is the target for both edges)
        act(() => {
            result.current.deleteNode('node-3')
        })

        // All edges to node-3 should be removed
        expect(result.current.state.edges).toHaveLength(0)
    })

    it('should mark state as dirty when node is deleted', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2')],
            edges: []
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Initial state should not be dirty
        expect(result.current.state.isDirty).toBe(false)

        // Delete a node
        act(() => {
            result.current.deleteNode('node-1')
        })

        // State should be marked as dirty
        expect(result.current.state.isDirty).toBe(true)
    })

    it('should call local state setters when registered', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2')],
            edges: [makeEdge('node-1', 'node-2', { id: 'edge-1-2' })]
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Create mock local state setters
        const mockSetLocalNodes = jest.fn()
        const mockSetLocalEdges = jest.fn()

        // Register the local state setters
        act(() => {
            result.current.registerLocalStateSetters(mockSetLocalNodes, mockSetLocalEdges)
        })

        // Delete a node
        act(() => {
            result.current.deleteNode('node-1')
        })

        // Local state setters should be called with updated nodes and edges
        expect(mockSetLocalNodes).toHaveBeenCalledTimes(1)
        expect(mockSetLocalNodes).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'node-2' })]))
        expect(mockSetLocalNodes).toHaveBeenCalledWith(expect.not.arrayContaining([expect.objectContaining({ id: 'node-1' })]))

        expect(mockSetLocalEdges).toHaveBeenCalledTimes(1)
        expect(mockSetLocalEdges).toHaveBeenCalledWith([])
    })

    it('should handle deleting a node that does not exist', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2')],
            edges: []
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Initial state
        const initialNodesLength = result.current.state.nodes.length

        // Try to delete a non-existent node
        act(() => {
            result.current.deleteNode('non-existent-node')
        })

        // Should not crash and nodes should remain the same
        expect(result.current.state.nodes).toHaveLength(initialNodesLength)
        expect(result.current.state.nodes.map((n) => n.id)).toEqual(['node-1', 'node-2'])
        expect(result.current.state.isDirty).toBe(true)
    })

    it('should handle deleting multiple nodes sequentially', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2'), makeNode('node-3')],
            edges: [makeEdge('node-1', 'node-2', { id: 'edge-1-2' }), makeEdge('node-2', 'node-3', { id: 'edge-2-3' })]
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Delete first node
        act(() => {
            result.current.deleteNode('node-1')
        })

        expect(result.current.state.nodes).toHaveLength(2)
        expect(result.current.state.edges).toHaveLength(1)
        expect(result.current.state.edges[0].id).toBe('edge-2-3')

        // Delete second node
        act(() => {
            result.current.deleteNode('node-2')
        })

        expect(result.current.state.nodes).toHaveLength(1)
        expect(result.current.state.nodes[0].id).toBe('node-3')
        expect(result.current.state.edges).toHaveLength(0)
    })

    it('should preserve other nodes and edges when deleting a node', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2'), makeNode('node-3'), makeNode('node-4')],
            edges: [makeEdge('node-1', 'node-2', { id: 'edge-1-2' }), makeEdge('node-3', 'node-4', { id: 'edge-3-4' })]
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Delete node-2 (connected to node-1)
        act(() => {
            result.current.deleteNode('node-2')
        })

        // Should preserve node-3, node-4 and their edge
        expect(result.current.state.nodes).toHaveLength(3)
        expect(result.current.state.nodes.map((n) => n.id)).toEqual(['node-1', 'node-3', 'node-4'])

        expect(result.current.state.edges).toHaveLength(1)
        expect(result.current.state.edges[0].id).toBe('edge-3-4')
    })
})
