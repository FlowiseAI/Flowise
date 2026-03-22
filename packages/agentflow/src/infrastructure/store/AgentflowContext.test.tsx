import { ReactNode } from 'react'

import { makeFlowEdge, makeFlowNode } from '@test-utils/factories'
import { act, renderHook } from '@testing-library/react'

import type { FlowData, FlowEdge, FlowNode } from '@/core/types'

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

describe('AgentflowContext', () => {
    describe('deleteNode', () => {
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

    describe('duplicateNode', () => {
        it('should create a duplicate node with unique ID using getUniqueNodeId', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        data: { id: 'agentflow_0', name: 'agentflow', label: 'Agent 1', outputAnchors: [] }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            // Initial state should have 1 node
            expect(result.current.state.nodes).toHaveLength(1)

            // Duplicate the node
            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            // Should have 2 nodes
            expect(result.current.state.nodes).toHaveLength(2)

            // Find the duplicated node - should use getUniqueNodeId format (agentflow_1, not agentflow_0_copy_1)
            const duplicatedNode = result.current.state.nodes.find((n) => n.id === 'agentflow_1')

            expect(duplicatedNode).toBeDefined()
            expect(duplicatedNode?.id).toBe('agentflow_1')
            expect(duplicatedNode?.data.id).toBe('agentflow_1')
        })

        it('should position duplicate using width + distance formula', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        position: { x: 100, y: 200 },
                        width: 300,
                        data: { id: 'agentflow_0', name: 'agentflow', label: 'Agent 1', outputAnchors: [] }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            // Duplicate the node with default distance (50)
            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            // Find the duplicated node
            const duplicatedNode = result.current.state.nodes.find((n) => n.id === 'agentflow_1')

            // Position should be: original.x + width + distance = 100 + 300 + 50 = 450
            expect(duplicatedNode?.position.x).toBe(450)
            expect(duplicatedNode?.position.y).toBe(200) // Y unchanged
        })

        it('should support custom distance parameter', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        position: { x: 100, y: 200 },
                        width: 300,
                        data: { id: 'agentflow_0', name: 'agentflow', label: 'Agent 1', outputAnchors: [] }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            // Duplicate with custom distance of 100
            act(() => {
                result.current.duplicateNode('agentflow_0', 100)
            })

            const duplicatedNode = result.current.state.nodes.find((n) => n.id === 'agentflow_1')

            // Position: 100 + 300 + 100 = 500
            expect(duplicatedNode?.position.x).toBe(500)
        })

        it('should set label with number suffix format', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        data: { id: 'agentflow_0', name: 'agentflow', label: 'Agent 1', outputAnchors: [] }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            const duplicatedNode = result.current.state.nodes.find((n) => n.id === 'agentflow_1')

            // Label should be "Agent 1 (1)" - extracted from agentflow_1
            expect(duplicatedNode?.data.label).toBe('Agent 1 (1)')
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
                            description: 'Test description',
                            outputAnchors: []
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
            const duplicatedNode = result.current.state.nodes.find((n) => n.id === 'testNode_0')

            // Should preserve data properties
            expect(duplicatedNode?.data.name).toBe('testNode')
            expect(duplicatedNode?.data.label).toBe('Test Node (0)') // Label gets suffix
            expect(duplicatedNode?.data.color).toBe('#FF0000')
            expect(duplicatedNode?.data.category).toBe('test')
            expect(duplicatedNode?.data.description).toBe('Test description')
        })

        it('should preserve node type', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('stickyNote_0', {
                        type: 'stickyNote',
                        data: { id: 'stickyNote_0', name: 'stickyNote', label: 'Note', outputAnchors: [] }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            // Duplicate the node
            act(() => {
                result.current.duplicateNode('stickyNote_0')
            })

            // Find the duplicated node
            const duplicatedNode = result.current.state.nodes.find((n) => n.id === 'stickyNote_1')

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
                nodes: [
                    makeFlowNode('agentflow_0', {
                        position: { x: 100, y: 200 },
                        data: {
                            id: 'agentflow_0',
                            name: 'agentflow',
                            label: 'Original Label',
                            inputAnchors: [{ id: 'agentflow_0-input-model-LLM', name: 'model', label: 'Model', type: 'LLM' }],
                            outputAnchors: []
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
                result.current.duplicateNode('agentflow_0')
            })

            // Find the original node
            const originalNodeAfter = result.current.state.nodes.find((n) => n.id === 'agentflow_0')

            // Original should be completely unchanged
            expect(originalNodeAfter?.position.x).toBe(100)
            expect(originalNodeAfter?.position.y).toBe(200)
            expect(originalNodeAfter?.data.label).toBe('Original Label')
            expect(originalNodeAfter?.data.id).toBe('agentflow_0')
            // Verify nested objects aren't mutated
            expect(originalNodeAfter?.data.inputAnchors?.[0]?.id).toBe('agentflow_0-input-model-LLM')
        })

        it('should handle multiple sequential duplications with unique IDs', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        data: { id: 'agentflow_0', name: 'agentflow', label: 'Agent 1', outputAnchors: [] }
                    }),
                    makeFlowNode('tool_0', {
                        data: { id: 'tool_0', name: 'tool', label: 'Tool 1', outputAnchors: [] }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            act(() => {
                result.current.duplicateNode('tool_0')
            })

            // Should have 4 nodes (2 originals + 2 duplicates)
            expect(result.current.state.nodes).toHaveLength(4)

            // All IDs should be unique
            const ids = result.current.state.nodes.map((n) => n.id)
            const uniqueIds = new Set(ids)
            expect(uniqueIds.size).toBe(4)

            // Should have the correct IDs
            expect(result.current.state.nodes.find((n) => n.id === 'agentflow_0')).toBeDefined()
            expect(result.current.state.nodes.find((n) => n.id === 'agentflow_1')).toBeDefined()
            expect(result.current.state.nodes.find((n) => n.id === 'tool_0')).toBeDefined()
            expect(result.current.state.nodes.find((n) => n.id === 'tool_1')).toBeDefined()

            // Each node should have matching node.id and data.id
            result.current.state.nodes.forEach((node) => {
                expect(node.id).toBe(node.data.id)
            })
        })

        it('should update anchor IDs to match new node ID', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        data: {
                            id: 'agentflow_0',
                            name: 'agentflow',
                            label: 'Agent 1',
                            inputs: [{ id: 'agentflow_0-input-model-string', name: 'model', label: 'Model', type: 'string' }],
                            inputAnchors: [{ id: 'agentflow_0-input-llm-LLM', name: 'llm', label: 'LLM', type: 'LLM' }],
                            outputAnchors: [{ id: 'agentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
                        }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            const original = result.current.state.nodes.find((n) => n.id === 'agentflow_0')
            const duplicate = result.current.state.nodes.find((n) => n.id === 'agentflow_1')

            // Original node IDs should be unchanged
            expect(original?.data.inputs?.[0]?.id).toBe('agentflow_0-input-model-string')
            expect(original?.data.inputAnchors?.[0]?.id).toBe('agentflow_0-input-llm-LLM')
            expect(original?.data.outputAnchors?.[0]?.id).toBe('agentflow_0-output-0')

            // Duplicate node IDs should be updated to use new node ID
            expect(duplicate?.data.inputs?.[0]?.id).toBe('agentflow_1-input-model-string')
            expect(duplicate?.data.inputAnchors?.[0]?.id).toBe('agentflow_1-input-llm-LLM')
            expect(duplicate?.data.outputAnchors?.[0]?.id).toBe('agentflow_1-output-0')
        })

        it('should clear connected input values (string connections)', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        data: {
                            id: 'agentflow_0',
                            name: 'agentflow',
                            label: 'Agent 1',
                            inputs: [{ id: 'agentflow_0-input-model-string', name: 'model', label: 'Model', type: 'string' }],
                            inputValues: {
                                model: '{{agent_upstream.data.instance}}', // Connection reference
                                temperature: '0.7', // Regular value
                                apiKey: 'sk-1234' // Regular value
                            },
                            outputAnchors: []
                        }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            const original = result.current.state.nodes.find((n) => n.id === 'agentflow_0')
            const duplicate = result.current.state.nodes.find((n) => n.id === 'agentflow_1')

            // Original should still have the connection
            expect(original?.data.inputValues?.model).toBe('{{agent_upstream.data.instance}}')
            expect(original?.data.inputValues?.temperature).toBe('0.7')
            expect(original?.data.inputValues?.apiKey).toBe('sk-1234')

            // Duplicate should have connection cleared but regular values preserved
            expect(duplicate?.data.inputValues?.model).toBe('') // Cleared (no default)
            expect(duplicate?.data.inputValues?.temperature).toBe('0.7') // Preserved
            expect(duplicate?.data.inputValues?.apiKey).toBe('sk-1234') // Preserved
        })

        it('should reset connected input values to parameter defaults', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        data: {
                            id: 'agentflow_0',
                            name: 'agentflow',
                            label: 'Agent 1',
                            inputs: [
                                { id: 'agentflow_0-input-model-string', name: 'model', label: 'Model', type: 'string', default: 'gpt-4' },
                                { id: 'agentflow_0-input-temp-number', name: 'temperature', label: 'Temp', type: 'number', default: 0.7 }
                            ],
                            inputValues: {
                                model: '{{agent_upstream.data.instance}}', // Connection
                                temperature: '{{agent_upstream.data.temperature}}' // Connection
                            },
                            outputAnchors: []
                        }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            const duplicate = result.current.state.nodes.find((n) => n.id === 'agentflow_1')

            // Should reset to parameter defaults
            expect(duplicate?.data.inputValues?.model).toBe('gpt-4')
            expect(duplicate?.data.inputValues?.temperature).toBe(0.7)
        })

        it('should filter connection strings from array input values', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        data: {
                            id: 'agentflow_0',
                            name: 'agentflow',
                            label: 'Agent 1',
                            inputValues: {
                                tools: ['{{agent_tool1.data.instance}}', '{{agent_tool2.data.instance}}', 'regularValue'],
                                models: ['gpt-4', 'gpt-3.5'] // No connections
                            },
                            outputAnchors: []
                        }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            const original = result.current.state.nodes.find((n) => n.id === 'agentflow_0')
            const duplicate = result.current.state.nodes.find((n) => n.id === 'agentflow_1')

            // Original should be unchanged
            expect(original?.data.inputValues?.tools).toEqual([
                '{{agent_tool1.data.instance}}',
                '{{agent_tool2.data.instance}}',
                'regularValue'
            ])
            expect(original?.data.inputValues?.models).toEqual(['gpt-4', 'gpt-3.5'])

            // Duplicate should filter out connection strings but keep regular values
            expect(duplicate?.data.inputValues?.tools).toEqual(['regularValue'])
            expect(duplicate?.data.inputValues?.models).toEqual(['gpt-4', 'gpt-3.5'])
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

        it('should generate sequential unique IDs for duplicates', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        data: { id: 'agentflow_0', name: 'agentflow', label: 'Agent 1', outputAnchors: [] }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            // Duplicate the node once
            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            // Find the first duplicated node
            const firstDuplicate = result.current.state.nodes.find((n) => n.id === 'agentflow_1')
            expect(firstDuplicate).toBeDefined()
            expect(firstDuplicate?.data.label).toBe('Agent 1 (1)')

            // Duplicate the original node again
            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            // Find the second duplicated node
            const secondDuplicate = result.current.state.nodes.find((n) => n.id === 'agentflow_2')
            expect(secondDuplicate).toBeDefined()
            expect(secondDuplicate?.data.label).toBe('Agent 1 (2)')

            // Should have 3 nodes total (original + 2 duplicates)
            expect(result.current.state.nodes).toHaveLength(3)
        })

        it('should deep clone to avoid mutating original node', () => {
            const initialFlow: FlowData = {
                nodes: [
                    makeFlowNode('agentflow_0', {
                        data: {
                            id: 'agentflow_0',
                            name: 'agentflow',
                            label: 'Agent 1',
                            inputAnchors: [{ id: 'agentflow_0-input-model-LLM', name: 'model', label: 'Model', type: 'LLM' }],
                            outputAnchors: [{ id: 'agentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
                        }
                    })
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.duplicateNode('agentflow_0')
            })

            const original = result.current.state.nodes.find((n) => n.id === 'agentflow_0')

            // Original node's nested objects should NOT be mutated
            expect(original?.data.inputAnchors?.[0]?.id).toBe('agentflow_0-input-model-LLM')
            expect(original?.data.outputAnchors?.[0]?.id).toBe('agentflow_0-output-0')
            expect(original?.data.label).toBe('Agent 1')

            // Verify the duplicate has different IDs (proves deep clone worked)
            const duplicate = result.current.state.nodes.find((n) => n.id === 'agentflow_1')
            expect(duplicate?.data.inputAnchors?.[0]?.id).toBe('agentflow_1-input-model-LLM')
            expect(duplicate?.data.outputAnchors?.[0]?.id).toBe('agentflow_1-output-0')
        })
    })

    describe('openEditDialog & closeEditDialog', () => {
        it('should open edit dialog with node data and input params', () => {
            const initialFlow: FlowData = {
                nodes: [makeNode('node-1')],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            // Initial state should have no editing node
            expect(result.current.state.editingNodeId).toBeNull()
            expect(result.current.state.editDialogProps).toBeNull()

            const nodeData = {
                id: 'node-1',
                name: 'testNode',
                label: 'Test Node',
                outputAnchors: []
            }

            const inputParams = [
                {
                    id: 'param-1',
                    name: 'param1',
                    label: 'Parameter 1',
                    type: 'string'
                }
            ]

            // Open edit dialog
            act(() => {
                result.current.openEditDialog('node-1', nodeData, inputParams)
            })

            // Should set editingNodeId
            expect(result.current.state.editingNodeId).toBe('node-1')

            // Should set editDialogProps
            expect(result.current.state.editDialogProps).toEqual({
                inputParams: inputParams,
                data: nodeData,
                disabled: false
            })
        })

        it('should close edit dialog and clear state', () => {
            const initialFlow: FlowData = {
                nodes: [makeNode('node-1')],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            const nodeData = {
                id: 'node-1',
                name: 'testNode',
                label: 'Test Node',
                outputAnchors: []
            }

            const inputParams = [
                {
                    id: 'param-1',
                    name: 'param1',
                    label: 'Parameter 1',
                    type: 'string'
                }
            ]

            // First open the dialog
            act(() => {
                result.current.openEditDialog('node-1', nodeData, inputParams)
            })

            // Verify dialog is open
            expect(result.current.state.editingNodeId).toBe('node-1')
            expect(result.current.state.editDialogProps).not.toBeNull()

            // Close the dialog
            act(() => {
                result.current.closeEditDialog()
            })

            // Should clear editingNodeId
            expect(result.current.state.editingNodeId).toBeNull()

            // Should clear editDialogProps
            expect(result.current.state.editDialogProps).toBeNull()
        })

        it('should handle opening dialog for different nodes', () => {
            const initialFlow: FlowData = {
                nodes: [makeNode('node-1'), makeNode('node-2')],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            const nodeData1 = {
                id: 'node-1',
                name: 'testNode1',
                label: 'Test Node 1',
                outputAnchors: []
            }

            const nodeData2 = {
                id: 'node-2',
                name: 'testNode2',
                label: 'Test Node 2',
                outputAnchors: []
            }

            const inputParams = [
                {
                    id: 'param-1',
                    name: 'param1',
                    label: 'Parameter 1',
                    type: 'string'
                }
            ]

            // Open dialog for node-1
            act(() => {
                result.current.openEditDialog('node-1', nodeData1, inputParams)
            })

            expect(result.current.state.editingNodeId).toBe('node-1')
            expect(result.current.state.editDialogProps).not.toBeNull()
            expect(result.current.state.editDialogProps!.data).toBeDefined()
            expect(result.current.state.editDialogProps!.data!.label).toBe('Test Node 1')

            // Open dialog for node-2 (should replace node-1)
            act(() => {
                result.current.openEditDialog('node-2', nodeData2, inputParams)
            })

            expect(result.current.state.editingNodeId).toBe('node-2')
            expect(result.current.state.editDialogProps).not.toBeNull()
            expect(result.current.state.editDialogProps!.data).toBeDefined()
            expect(result.current.state.editDialogProps!.data!.label).toBe('Test Node 2')
        })

        it('should set disabled to false in dialog props', () => {
            const initialFlow: FlowData = {
                nodes: [makeNode('node-1')],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            const nodeData = {
                id: 'node-1',
                name: 'testNode',
                label: 'Test Node',
                outputAnchors: []
            }

            act(() => {
                result.current.openEditDialog('node-1', nodeData, [])
            })

            // disabled should always be false
            expect(result.current.state.editDialogProps?.disabled).toBe(false)
        })

        it('should preserve inputParams in dialog props', () => {
            const initialFlow: FlowData = {
                nodes: [makeNode('node-1')],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            const nodeData = {
                id: 'node-1',
                name: 'testNode',
                label: 'Test Node',
                outputAnchors: []
            }

            const inputParams = [
                {
                    id: 'param-1',
                    name: 'param1',
                    label: 'Parameter 1',
                    type: 'string',
                    optional: true
                },
                {
                    id: 'param-2',
                    name: 'param2',
                    label: 'Parameter 2',
                    type: 'number',
                    default: 42
                }
            ]

            act(() => {
                result.current.openEditDialog('node-1', nodeData, inputParams)
            })

            // Should preserve all input params with their properties
            expect(result.current.state.editDialogProps).not.toBeNull()
            expect(result.current.state.editDialogProps!.inputParams).toEqual(inputParams)
            expect(result.current.state.editDialogProps!.inputParams).toHaveLength(2)

            const params = result.current.state.editDialogProps!.inputParams!
            expect(params[0]).toBeDefined()
            expect(params[0]!.optional).toBe(true)
            expect(params[1]).toBeDefined()
            expect(params[1]!.default).toBe(42)
        })
    })

    describe('state synchronization', () => {
        let mockSetLocalNodes: jest.Mock
        let mockSetLocalEdges: jest.Mock

        beforeEach(() => {
            mockSetLocalNodes = jest.fn()
            mockSetLocalEdges = jest.fn()
        })

        it('should call local state setters for setNodes', () => {
            const initialFlow: FlowData = {
                nodes: [
                    {
                        id: 'node-1',
                        type: 'agentflowNode',
                        position: { x: 100, y: 100 },
                        data: {
                            id: 'node-1',
                            name: 'Node 1',
                            label: 'Node 1',
                            outputAnchors: []
                        }
                    }
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.registerLocalStateSetters(mockSetLocalNodes, mockSetLocalEdges)
            })

            const newNodes: FlowNode[] = [
                {
                    id: 'node-2',
                    type: 'agentflowNode',
                    position: { x: 200, y: 200 },
                    data: {
                        id: 'node-2',
                        name: 'Node 2',
                        label: 'Node 2',
                        outputAnchors: []
                    }
                },
                {
                    id: 'node-3',
                    type: 'agentflowNode',
                    position: { x: 300, y: 300 },
                    data: {
                        id: 'node-3',
                        name: 'Node 3',
                        label: 'Node 3',
                        outputAnchors: []
                    }
                }
            ]

            act(() => {
                result.current.setNodes(newNodes)
            })

            // Verify local state setter was called
            expect(mockSetLocalNodes).toHaveBeenCalledTimes(1)
            expect(mockSetLocalNodes).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ id: 'node-2' }), expect.objectContaining({ id: 'node-3' })])
            )

            // Verify context state was updated
            expect(result.current.state.nodes).toHaveLength(2)
            expect(result.current.state.nodes[0].id).toBe('node-2')
            expect(result.current.state.nodes[1].id).toBe('node-3')
        })

        it('should call local state setters for setEdges', () => {
            const initialFlow: FlowData = {
                nodes: [
                    {
                        id: 'node-1',
                        type: 'agentflowNode',
                        position: { x: 100, y: 100 },
                        data: {
                            id: 'node-1',
                            name: 'Node 1',
                            label: 'Node 1',
                            outputAnchors: []
                        }
                    },
                    {
                        id: 'node-2',
                        type: 'agentflowNode',
                        position: { x: 200, y: 200 },
                        data: {
                            id: 'node-2',
                            name: 'Node 2',
                            label: 'Node 2',
                            outputAnchors: []
                        }
                    }
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.registerLocalStateSetters(mockSetLocalNodes, mockSetLocalEdges)
            })

            const newEdges: FlowEdge[] = [
                {
                    id: 'edge-1',
                    source: 'node-1',
                    target: 'node-2',
                    type: 'agentflowEdge'
                },
                {
                    id: 'edge-2',
                    source: 'node-2',
                    target: 'node-1',
                    type: 'agentflowEdge'
                }
            ]

            act(() => {
                result.current.setEdges(newEdges)
            })

            // Verify local state setter was called
            expect(mockSetLocalEdges).toHaveBeenCalledTimes(1)
            expect(mockSetLocalEdges).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ id: 'edge-1' }), expect.objectContaining({ id: 'edge-2' })])
            )

            // Verify context state was updated
            expect(result.current.state.edges).toHaveLength(2)
            expect(result.current.state.edges[0].id).toBe('edge-1')
            expect(result.current.state.edges[1].id).toBe('edge-2')
        })

        it('should call local state setters for updateNodeData', () => {
            const initialFlow: FlowData = {
                nodes: [
                    {
                        id: 'node-1',
                        type: 'agentflowNode',
                        position: { x: 100, y: 100 },
                        data: {
                            id: 'node-1',
                            name: 'Node 1',
                            label: 'Node 1',
                            outputAnchors: []
                        }
                    },
                    {
                        id: 'node-2',
                        type: 'agentflowNode',
                        position: { x: 200, y: 200 },
                        data: {
                            id: 'node-2',
                            name: 'Node 2',
                            label: 'Node 2',
                            outputAnchors: []
                        }
                    }
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.registerLocalStateSetters(mockSetLocalNodes, mockSetLocalEdges)
            })

            const updatedData = {
                label: 'Updated Node 1',
                name: 'updated-node-1'
            }

            act(() => {
                result.current.updateNodeData('node-1', updatedData)
            })

            // Verify local state setter was called
            expect(mockSetLocalNodes).toHaveBeenCalledTimes(1)
            expect(mockSetLocalNodes).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 'node-1',
                        data: expect.objectContaining({
                            label: 'Updated Node 1',
                            name: 'updated-node-1'
                        })
                    }),
                    expect.objectContaining({ id: 'node-2' })
                ])
            )

            // Verify context state was updated
            const updatedNode = result.current.state.nodes.find((n) => n.id === 'node-1')
            expect(updatedNode?.data.label).toBe('Updated Node 1')
            expect(updatedNode?.data.name).toBe('updated-node-1')

            // Verify other node was not affected
            const otherNode = result.current.state.nodes.find((n) => n.id === 'node-2')
            expect(otherNode?.data.label).toBe('Node 2')
        })

        it('should call local state setters for deleteEdge', () => {
            const initialFlow: FlowData = {
                nodes: [
                    {
                        id: 'node-1',
                        type: 'agentflowNode',
                        position: { x: 100, y: 100 },
                        data: {
                            id: 'node-1',
                            name: 'Node 1',
                            label: 'Node 1',
                            outputAnchors: []
                        }
                    },
                    {
                        id: 'node-2',
                        type: 'agentflowNode',
                        position: { x: 200, y: 200 },
                        data: {
                            id: 'node-2',
                            name: 'Node 2',
                            label: 'Node 2',
                            outputAnchors: []
                        }
                    }
                ],
                edges: [
                    {
                        id: 'edge-1',
                        source: 'node-1',
                        target: 'node-2',
                        type: 'agentflowEdge'
                    },
                    {
                        id: 'edge-2',
                        source: 'node-2',
                        target: 'node-1',
                        type: 'agentflowEdge'
                    }
                ]
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.registerLocalStateSetters(mockSetLocalNodes, mockSetLocalEdges)
            })

            act(() => {
                result.current.deleteEdge('edge-1')
            })

            // Verify local state setter was called
            expect(mockSetLocalEdges).toHaveBeenCalledTimes(1)
            expect(mockSetLocalEdges).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'edge-2' })]))

            // Verify context state was updated
            expect(result.current.state.edges).toHaveLength(1)
            expect(result.current.state.edges[0].id).toBe('edge-2')
        })

        it('should synchronize state for combined operations', () => {
            const initialFlow: FlowData = {
                nodes: [
                    {
                        id: 'node-1',
                        type: 'agentflowNode',
                        position: { x: 100, y: 100 },
                        data: {
                            id: 'node-1',
                            name: 'Node 1',
                            label: 'Node 1',
                            outputAnchors: []
                        }
                    }
                ],
                edges: []
            }

            const { result } = renderHook(() => useAgentflowContext(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.registerLocalStateSetters(mockSetLocalNodes, mockSetLocalEdges)
            })

            // 1. Add a new node via setNodes
            act(() => {
                result.current.setNodes([
                    ...result.current.state.nodes,
                    {
                        id: 'node-2',
                        type: 'agentflowNode',
                        position: { x: 200, y: 200 },
                        data: {
                            id: 'node-2',
                            name: 'Node 2',
                            label: 'Node 2',
                            outputAnchors: []
                        }
                    }
                ])
            })

            expect(mockSetLocalNodes).toHaveBeenCalledTimes(1)

            // 2. Duplicate node-1
            act(() => {
                result.current.duplicateNode('node-1')
            })

            expect(mockSetLocalNodes).toHaveBeenCalledTimes(2)

            // 3. Update node-2 data
            act(() => {
                result.current.updateNodeData('node-2', { label: 'Updated Node 2' })
            })

            expect(mockSetLocalNodes).toHaveBeenCalledTimes(3)

            // Verify final state
            expect(result.current.state.nodes).toHaveLength(3)
            expect(result.current.state.nodes.find((n) => n.id === 'node-1')).toBeDefined()
            expect(result.current.state.nodes.find((n) => n.id === 'node-2')?.data.label).toBe('Updated Node 2')
            expect(result.current.state.nodes.find((n) => n.id === 'Node 1_0')).toBeDefined()
        })
    })
})
