import type { Node } from 'reactflow'

import { makeFlowEdge, makeFlowNode, makeNodeData } from '@test-utils/factories'
import { act, renderHook } from '@testing-library/react'

import type { FlowEdge, FlowNode, NodeData } from '@/core/types'

import { useFlowHandlers } from './useFlowHandlers'

// Mock external dependencies
jest.mock('reactflow')

// Mock the store context
const mockSetDirty = jest.fn()
const mockGetViewport = jest.fn(() => ({ x: 10, y: 20, zoom: 1.5 }))
let mockReactFlowInstance: { getViewport: jest.Mock } | null = { getViewport: mockGetViewport }
jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: {
            reactFlowInstance: mockReactFlowInstance
        },
        setDirty: mockSetDirty
    })
}))

// Mock core utilities
jest.mock('@/core', () => ({
    getNodeColor: jest.fn((name: string) => (name === 'nodeA' ? '#ff0000' : '#00ff00')),
    getUniqueNodeId: jest.fn((_data: NodeData, _nodes: FlowNode[]) => 'new-node-1'),
    getUniqueNodeLabel: jest.fn((_data: NodeData, _nodes: FlowNode[]) => 'New Node 1'),
    initNode: jest.fn((data: NodeData, id: string) => ({ ...data, id })),
    isValidConnectionAgentflowV2: jest.fn(() => true)
}))

describe('useFlowHandlers', () => {
    let nodes: FlowNode[]
    let edges: FlowEdge[]
    let setLocalNodes: jest.Mock
    let setLocalEdges: jest.Mock
    let onNodesChange: jest.Mock
    let onEdgesChange: jest.Mock
    let onFlowChange: jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        mockReactFlowInstance = { getViewport: mockGetViewport }

        nodes = [makeFlowNode('a', { data: { id: 'a', name: 'nodeA', label: 'Node A' } }), makeFlowNode('b')]
        edges = [makeFlowEdge('a', 'b')]
        setLocalNodes = jest.fn((updater) => {
            if (typeof updater === 'function') updater(nodes)
        })
        setLocalEdges = jest.fn((updater) => {
            if (typeof updater === 'function') updater(edges)
        })
        onNodesChange = jest.fn()
        onEdgesChange = jest.fn()
        onFlowChange = jest.fn()
    })

    function renderUseFlowHandlers(overrides = {}) {
        return renderHook(() =>
            useFlowHandlers({
                nodes,
                edges,
                setLocalNodes,
                setLocalEdges,
                onNodesChange,
                onEdgesChange,
                onFlowChange,
                availableNodes: [],
                ...overrides
            })
        )
    }

    describe('handleConnect', () => {
        it('should call onFlowChange synchronously with updated edges and viewport', () => {
            const { result } = renderUseFlowHandlers()

            act(() => {
                result.current.handleConnect({ source: 'a', target: 'b', sourceHandle: null, targetHandle: null })
            })

            expect(onFlowChange).toHaveBeenCalledTimes(1)
            expect(onFlowChange).toHaveBeenCalledWith({
                nodes,
                edges: expect.arrayContaining([expect.objectContaining({ type: 'agentflowEdge' })]),
                viewport: { x: 10, y: 20, zoom: 1.5 }
            })
        })

        it('should set dirty to true on valid connection', () => {
            const { result } = renderUseFlowHandlers()

            act(() => {
                result.current.handleConnect({ source: 'a', target: 'b', sourceHandle: null, targetHandle: null })
            })

            expect(mockSetDirty).toHaveBeenCalledWith(true)
        })

        it('should not call onFlowChange when source or target is missing', () => {
            const { result } = renderUseFlowHandlers()

            act(() => {
                result.current.handleConnect({ source: null, target: 'b', sourceHandle: null, targetHandle: null })
            })

            expect(onFlowChange).not.toHaveBeenCalled()
            expect(mockSetDirty).not.toHaveBeenCalled()
        })
    })

    describe('handleNodesChange', () => {
        it('should call onFlowChange synchronously for meaningful changes', () => {
            const { result } = renderUseFlowHandlers()
            const changes = [{ type: 'remove' as const, id: 'a' }]

            act(() => {
                result.current.handleNodesChange(changes)
            })

            expect(onNodesChange).toHaveBeenCalledWith(changes)
            expect(mockSetDirty).toHaveBeenCalledWith(true)
            expect(onFlowChange).toHaveBeenCalledTimes(1)
            expect(onFlowChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    nodes: expect.any(Array),
                    edges,
                    viewport: { x: 10, y: 20, zoom: 1.5 }
                })
            )
        })

        it('should not set dirty or notify for selection-only changes', () => {
            const { result } = renderUseFlowHandlers()
            const changes = [{ type: 'select' as const, id: 'a', selected: true }]

            act(() => {
                result.current.handleNodesChange(changes)
            })

            expect(onNodesChange).toHaveBeenCalledWith(changes)
            expect(mockSetDirty).not.toHaveBeenCalled()
            expect(onFlowChange).not.toHaveBeenCalled()
        })

        it('should not set dirty or notify for dimension-only changes', () => {
            const { result } = renderUseFlowHandlers()
            const changes = [{ type: 'dimensions' as const, id: 'a', dimensions: { width: 100, height: 100 } }]

            act(() => {
                result.current.handleNodesChange(changes)
            })

            expect(onNodesChange).toHaveBeenCalledWith(changes)
            expect(mockSetDirty).not.toHaveBeenCalled()
            expect(onFlowChange).not.toHaveBeenCalled()
        })

        it('should not set dirty or notify for position-only changes (handled by onNodeDragStop)', () => {
            const { result } = renderUseFlowHandlers()
            const changes = [{ type: 'position' as const, id: 'a', position: { x: 50, y: 50 } }]

            act(() => {
                result.current.handleNodesChange(changes)
            })

            expect(onNodesChange).toHaveBeenCalledWith(changes)
            expect(mockSetDirty).not.toHaveBeenCalled()
            expect(onFlowChange).not.toHaveBeenCalled()
        })
    })

    describe('handleNodeDragStop', () => {
        it('should call onFlowChange once when drag ends', () => {
            const { result } = renderUseFlowHandlers()
            const draggedNodes = [{ id: nodes[0].id, position: { x: 200, y: 300 } }] as Node[]

            act(() => {
                result.current.handleNodeDragStop({} as React.MouseEvent, draggedNodes[0], draggedNodes)
            })

            expect(mockSetDirty).toHaveBeenCalledWith(true)
            expect(onFlowChange).toHaveBeenCalledTimes(1)
            expect(onFlowChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    nodes: expect.arrayContaining([expect.objectContaining({ id: nodes[0].id, position: { x: 200, y: 300 } })]),
                    edges,
                    viewport: { x: 10, y: 20, zoom: 1.5 }
                })
            )
        })

        it('should not notify when no nodes were dragged', () => {
            const { result } = renderUseFlowHandlers()

            act(() => {
                result.current.handleNodeDragStop({} as React.MouseEvent, {} as Node, [])
            })

            expect(mockSetDirty).not.toHaveBeenCalled()
            expect(onFlowChange).not.toHaveBeenCalled()
        })
    })

    describe('handleEdgesChange', () => {
        it('should call onFlowChange synchronously for meaningful changes', () => {
            const { result } = renderUseFlowHandlers()
            const changes = [{ type: 'remove' as const, id: 'a-b' }]

            act(() => {
                result.current.handleEdgesChange(changes)
            })

            expect(onEdgesChange).toHaveBeenCalledWith(changes)
            expect(mockSetDirty).toHaveBeenCalledWith(true)
            expect(onFlowChange).toHaveBeenCalledTimes(1)
            expect(onFlowChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    nodes,
                    edges: expect.any(Array),
                    viewport: { x: 10, y: 20, zoom: 1.5 }
                })
            )
        })

        it('should not set dirty or notify for selection-only changes', () => {
            const { result } = renderUseFlowHandlers()
            const changes = [{ type: 'select' as const, id: 'a-b', selected: true }]

            act(() => {
                result.current.handleEdgesChange(changes)
            })

            expect(onEdgesChange).toHaveBeenCalledWith(changes)
            expect(mockSetDirty).not.toHaveBeenCalled()
            expect(onFlowChange).not.toHaveBeenCalled()
        })
    })

    describe('handleAddNode', () => {
        const availableNodes: NodeData[] = [
            makeNodeData({ name: 'llmAgentflow', label: 'LLM' }),
            makeNodeData({ name: 'agentAgentflow', label: 'Agent' })
        ]

        it('should add a node with default position when no position is provided', () => {
            const { result } = renderUseFlowHandlers({ availableNodes })

            act(() => {
                result.current.handleAddNode('llmAgentflow')
            })

            expect(setLocalNodes).toHaveBeenCalledTimes(1)
            // setLocalNodes is called with a functional updater; verify via onFlowChange
            const updatedNodes = onFlowChange.mock.calls[0][0].nodes
            const newNode = updatedNodes[updatedNodes.length - 1]
            expect(newNode).toMatchObject({
                id: 'new-node-1',
                type: 'agentflowNode',
                position: { x: 100, y: 100 }
            })
            expect(newNode.data.label).toBe('New Node 1')
        })

        it('should add a node at the specified position', () => {
            const { result } = renderUseFlowHandlers({ availableNodes })

            act(() => {
                result.current.handleAddNode('llmAgentflow', { x: 300, y: 400 })
            })

            const updatedNodes = onFlowChange.mock.calls[0][0].nodes
            const newNode = updatedNodes[updatedNodes.length - 1]
            expect(newNode.position).toEqual({ x: 300, y: 400 })
        })

        it('should set dirty to true after adding a node', () => {
            const { result } = renderUseFlowHandlers({ availableNodes })

            act(() => {
                result.current.handleAddNode('llmAgentflow')
            })

            expect(mockSetDirty).toHaveBeenCalledWith(true)
        })

        it('should do nothing when nodeType is not found in availableNodes', () => {
            const { result } = renderUseFlowHandlers({ availableNodes })

            act(() => {
                result.current.handleAddNode('nonExistentNode')
            })

            expect(setLocalNodes).not.toHaveBeenCalled()
            expect(mockSetDirty).not.toHaveBeenCalled()
        })
    })

    describe('viewport fallback', () => {
        it('should use fallback viewport when reactFlowInstance is null', () => {
            mockReactFlowInstance = null

            const { result } = renderUseFlowHandlers()
            const changes = [{ type: 'remove' as const, id: 'a' }]

            act(() => {
                result.current.handleNodesChange(changes)
            })

            expect(onFlowChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    viewport: { x: 0, y: 0, zoom: 1 }
                })
            )
        })
    })
})
