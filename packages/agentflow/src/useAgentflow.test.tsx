import { ReactNode } from 'react'

import { makeFlowEdge, makeFlowNode } from '@test-utils/factories'
import { act, renderHook } from '@testing-library/react'

import type { FlowData } from '@/core/types'
import { AgentflowStateProvider } from '@/infrastructure/store'

import { useAgentflow } from './useAgentflow'

const makeNode = (id: string, overrides?: Partial<ReturnType<typeof makeFlowNode>>) => makeFlowNode(id, overrides)
const makeEdge = makeFlowEdge

const createWrapper = (initialFlow?: FlowData) => {
    function Wrapper({ children }: { children: ReactNode }) {
        return <AgentflowStateProvider initialFlow={initialFlow}>{children}</AgentflowStateProvider>
    }
    return Wrapper
}

describe('useAgentflow', () => {
    describe('getFlow', () => {
        it('should return current nodes and edges', () => {
            const initialFlow: FlowData = {
                nodes: [makeNode('node-1'), makeNode('node-2')],
                edges: [makeEdge('node-1', 'node-2')]
            }

            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper(initialFlow)
            })

            const flow = result.current.getFlow()
            expect(flow.nodes).toHaveLength(2)
            expect(flow.edges).toHaveLength(1)
            expect(flow.nodes.map((n) => n.id)).toEqual(['node-1', 'node-2'])
        })

        it('should return empty arrays when no initial flow is provided', () => {
            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper()
            })

            const flow = result.current.getFlow()
            expect(flow.nodes).toEqual([])
            expect(flow.edges).toEqual([])
        })

        it('should include a default viewport when no ReactFlow instance exists', () => {
            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper()
            })

            const flow = result.current.getFlow()
            expect(flow.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
        })
    })

    describe('toJSON', () => {
        it('should return a valid JSON string of the flow', () => {
            const initialFlow: FlowData = {
                nodes: [makeNode('node-1')],
                edges: []
            }

            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper(initialFlow)
            })

            const json = result.current.toJSON()
            const parsed = JSON.parse(json)
            expect(parsed.nodes).toHaveLength(1)
            expect(parsed.nodes[0].id).toBe('node-1')
            expect(parsed.edges).toEqual([])
        })

        it('should produce pretty-printed JSON with 2-space indentation', () => {
            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper()
            })

            const json = result.current.toJSON()
            // Pretty-printed JSON has newlines
            expect(json).toContain('\n')
            // Verify it matches the expected format
            expect(json).toBe(JSON.stringify(result.current.getFlow(), null, 2))
        })
    })

    describe('validate', () => {
        it('should return invalid for an empty flow', () => {
            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper()
            })

            const validation = result.current.validate()
            expect(validation.valid).toBe(false)
            expect(validation.errors.length).toBeGreaterThan(0)
        })

        it('should return valid with warnings for a start node without connections', () => {
            const initialFlow: FlowData = {
                nodes: [makeNode('startAgentflow_0', { data: { id: 'startAgentflow_0', name: 'startAgentflow', label: 'Start' } })],
                edges: []
            }

            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper(initialFlow)
            })

            const validation = result.current.validate()
            expect(validation.valid).toBe(true)
            expect(validation.errors).toEqual([expect.objectContaining({ type: 'warning', nodeId: 'startAgentflow_0' })])
        })
    })

    describe('addNode', () => {
        it('should add a node with provided data', () => {
            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper()
            })

            act(() => {
                result.current.addNode({
                    id: 'new-node',
                    type: 'agentFlow',
                    position: { x: 200, y: 300 },
                    data: { id: 'new-node', name: 'test', label: 'Test' }
                })
            })

            const flow = result.current.getFlow()
            expect(flow.nodes).toHaveLength(1)
            expect(flow.nodes[0].id).toBe('new-node')
            expect(flow.nodes[0].position).toEqual({ x: 200, y: 300 })
        })

        it('should append to existing nodes', () => {
            const initialFlow: FlowData = {
                nodes: [makeNode('existing')],
                edges: []
            }

            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper(initialFlow)
            })

            act(() => {
                result.current.addNode({
                    id: 'new-node',
                    data: { id: 'new-node', name: 'test', label: 'Test' }
                })
            })

            const flow = result.current.getFlow()
            expect(flow.nodes).toHaveLength(2)
            expect(flow.nodes.map((n) => n.id)).toEqual(['existing', 'new-node'])
        })

        it('should apply default position and type when not provided', () => {
            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper()
            })

            act(() => {
                result.current.addNode({
                    data: { id: 'minimal', name: 'test', label: 'Test' }
                })
            })

            const flow = result.current.getFlow()
            expect(flow.nodes[0].position).toEqual({ x: 100, y: 100 })
            expect(flow.nodes[0].type).toBe('agentFlow')
        })
    })

    describe('clear', () => {
        it('should remove all nodes and edges', () => {
            const initialFlow: FlowData = {
                nodes: [makeNode('node-1'), makeNode('node-2')],
                edges: [makeEdge('node-1', 'node-2')]
            }

            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper(initialFlow)
            })

            expect(result.current.getFlow().nodes).toHaveLength(2)
            expect(result.current.getFlow().edges).toHaveLength(1)

            act(() => {
                result.current.clear()
            })

            const flow = result.current.getFlow()
            expect(flow.nodes).toEqual([])
            expect(flow.edges).toEqual([])
        })
    })

    describe('getReactFlowInstance', () => {
        it('should return null when no ReactFlow instance is available', () => {
            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper()
            })

            expect(result.current.getReactFlowInstance()).toBeNull()
        })
    })

    describe('fitView', () => {
        it('should not throw when no ReactFlow instance is available', () => {
            const { result } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper()
            })

            expect(() => result.current.fitView()).not.toThrow()
        })
    })

    describe('instance stability', () => {
        it('should return a stable instance reference when state has not changed', () => {
            const { result, rerender } = renderHook(() => useAgentflow(), {
                wrapper: createWrapper()
            })

            const first = result.current
            rerender()
            const second = result.current

            expect(first).toBe(second)
        })
    })
})
