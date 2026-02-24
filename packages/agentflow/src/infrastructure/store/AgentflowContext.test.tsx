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

describe('AgentflowContext - duplicateNode', () => {
    it('should create a duplicate node with unique ID', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2')],
            edges: []
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Initial state should have 2 nodes
        expect(result.current.state.nodes).toHaveLength(2)

        // Duplicate node-1
        act(() => {
            result.current.duplicateNode('node-1')
        })

        // Should have 3 nodes
        expect(result.current.state.nodes).toHaveLength(3)

        // Find the duplicated node
        const duplicatedNode = result.current.state.nodes.find((n) => n.id.startsWith('node-1_copy_'))

        expect(duplicatedNode).toBeDefined()
        expect(duplicatedNode?.id).toMatch(/^node-1_copy_\d+$/)
    })

    it('should position duplicate with +50 offset', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1')],
            edges: []
        }

        const originalNode = initialFlow.nodes[0]
        originalNode.position = { x: 100, y: 200 }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Duplicate the node
        act(() => {
            result.current.duplicateNode('node-1')
        })

        // Find the duplicated node
        const duplicatedNode = result.current.state.nodes.find((n) => n.id.startsWith('node-1_copy_'))

        expect(duplicatedNode?.position.x).toBe(150)
        expect(duplicatedNode?.position.y).toBe(250)
    })

    it('should preserve all node data properties', () => {
        const initialFlow: FlowData = {
            nodes: [
                makeFlowNode('node-1', {
                    type: 'customType',
                    data: {
                        id: 'node-1',
                        name: 'testNode',
                        label: 'Test Node',
                        color: '#FF0000',
                        category: 'test',
                        description: 'Test description'
                    }
                })
            ],
            edges: []
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Duplicate the node
        act(() => {
            result.current.duplicateNode('node-1')
        })

        // Find the duplicated node
        const duplicatedNode = result.current.state.nodes.find((n) => n.id.startsWith('node-1_copy_'))

        // Should preserve data properties (except id)
        expect(duplicatedNode?.data.name).toBe('testNode')
        expect(duplicatedNode?.data.label).toBe('Test Node')
        expect(duplicatedNode?.data.color).toBe('#FF0000')
        expect(duplicatedNode?.data.category).toBe('test')
        expect(duplicatedNode?.data.description).toBe('Test description')
    })

    it('should preserve node type', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1', 'stickyNote')],
            edges: []
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Duplicate the node
        act(() => {
            result.current.duplicateNode('node-1')
        })

        // Find the duplicated node
        const duplicatedNode = result.current.state.nodes.find((n) => n.id.startsWith('node-1_copy_'))

        expect(duplicatedNode?.type).toBe('stickyNote')
    })

    it('should mark state as dirty after duplication', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1')],
            edges: []
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Initial state should not be dirty
        expect(result.current.state.isDirty).toBe(false)

        // Duplicate a node
        act(() => {
            result.current.duplicateNode('node-1')
        })

        // State should be marked as dirty
        expect(result.current.state.isDirty).toBe(true)
    })

    it('should preserve original node unchanged', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1')],
            edges: []
        }

        const originalNode = initialFlow.nodes[0]
        originalNode.position = { x: 100, y: 200 }
        originalNode.data.label = 'Original Label'

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Duplicate the node
        act(() => {
            result.current.duplicateNode('node-1')
        })

        // Find the original node
        const originalNodeAfter = result.current.state.nodes.find((n) => n.id === 'node-1')

        // Original should be unchanged
        expect(originalNodeAfter?.position.x).toBe(100)
        expect(originalNodeAfter?.position.y).toBe(200)
        expect(originalNodeAfter?.data.label).toBe('Original Label')
        expect(originalNodeAfter?.data.id).toBe('node-1')
    })

    it('should handle multiple sequential duplications with unique IDs', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2')],
            edges: []
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Duplicate different nodes to avoid timestamp collision
        act(() => {
            result.current.duplicateNode('node-1')
        })

        act(() => {
            result.current.duplicateNode('node-2')
        })

        // Should have 4 nodes (2 originals + 2 duplicates)
        expect(result.current.state.nodes).toHaveLength(4)

        // All IDs should be unique
        const ids = result.current.state.nodes.map((n) => n.id)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(4)

        // Should have one duplicate of each original
        const node1Duplicates = result.current.state.nodes.filter((n) => n.id.startsWith('node-1_copy_'))
        const node2Duplicates = result.current.state.nodes.filter((n) => n.id.startsWith('node-2_copy_'))

        expect(node1Duplicates).toHaveLength(1)
        expect(node2Duplicates).toHaveLength(1)

        // Each duplicate should have matching node.id and data.id
        expect(node1Duplicates[0].id).toBe(node1Duplicates[0].data.id)
        expect(node2Duplicates[0].id).toBe(node2Duplicates[0].data.id)
    })

    it('should NOT duplicate connected edges', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1'), makeNode('node-2'), makeNode('node-3')],
            edges: [makeEdge('node-1', 'node-2', { id: 'edge-1-2' }), makeEdge('node-2', 'node-3', { id: 'edge-2-3' })]
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        // Initial state should have 2 edges
        expect(result.current.state.edges).toHaveLength(2)

        // Duplicate node-2 (which has incoming and outgoing edges)
        act(() => {
            result.current.duplicateNode('node-2')
        })

        // Should still have only 2 edges (edges not duplicated)
        expect(result.current.state.edges).toHaveLength(2)
        expect(result.current.state.edges[0].id).toBe('edge-1-2')
        expect(result.current.state.edges[1].id).toBe('edge-2-3')
    })

    it('should generate time-based unique IDs for duplicates', () => {
        const initialFlow: FlowData = {
            nodes: [makeNode('node-1')],
            edges: []
        }

        const { result } = renderHook(() => useAgentflowContext(), {
            wrapper: createWrapper(initialFlow)
        })

        const beforeTimestamp = Date.now()

        // Duplicate the node
        act(() => {
            result.current.duplicateNode('node-1')
        })

        const afterTimestamp = Date.now()

        // Find the duplicated node
        const duplicatedNode = result.current.state.nodes.find((n) => n.id.startsWith('node-1_copy_'))

        // Extract timestamp from ID
        const timestampMatch = duplicatedNode?.id.match(/_copy_(\d+)$/)
        expect(timestampMatch).toBeTruthy()

        const timestamp = parseInt(timestampMatch![1], 10)
        expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
        expect(timestamp).toBeLessThanOrEqual(afterTimestamp)
    })
})
