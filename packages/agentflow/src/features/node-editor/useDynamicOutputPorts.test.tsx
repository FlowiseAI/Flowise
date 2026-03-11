import { act, renderHook } from '@testing-library/react'

import { useDynamicOutputPorts } from './useDynamicOutputPorts'

// --- Mocks ---
const mockUpdateNodeData = jest.fn()
const mockUpdateNodeInternals = jest.fn()
const mockSetEdges = jest.fn()
let mockEdges: Array<{ id: string; source: string; target: string; sourceHandle?: string }> = []

jest.mock('reactflow', () => ({
    useUpdateNodeInternals: () => mockUpdateNodeInternals
}))

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: { edges: mockEdges },
        updateNodeData: mockUpdateNodeData,
        setEdges: mockSetEdges
    })
}))

describe('useDynamicOutputPorts', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockEdges = []
    })

    it('should sync output anchors when condition count changes', () => {
        const { result } = renderHook(() => useDynamicOutputPorts('node-1', 'Condition'))

        act(() => {
            result.current.syncOutputPorts(2)
        })

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
            outputAnchors: [
                { id: 'node-1-output-0', name: '0', label: 'Condition 0', type: 'Condition' },
                { id: 'node-1-output-1', name: '1', label: 'Condition 1', type: 'Condition' },
                { id: 'node-1-output-2', name: '2', label: 'Else', type: 'Condition' }
            ]
        })
        expect(mockUpdateNodeInternals).toHaveBeenCalledWith('node-1')
    })

    it('should not update when condition count is the same', () => {
        const { result } = renderHook(() => useDynamicOutputPorts('node-1', 'Condition'))

        act(() => {
            result.current.syncOutputPorts(2)
        })

        mockUpdateNodeData.mockClear()
        mockUpdateNodeInternals.mockClear()

        act(() => {
            result.current.syncOutputPorts(2)
        })

        expect(mockUpdateNodeData).not.toHaveBeenCalled()
        expect(mockUpdateNodeInternals).not.toHaveBeenCalled()
    })

    it('should update when condition count changes from previous value', () => {
        const { result } = renderHook(() => useDynamicOutputPorts('node-1', 'Condition'))

        act(() => {
            result.current.syncOutputPorts(1)
        })

        mockUpdateNodeData.mockClear()
        mockUpdateNodeInternals.mockClear()

        act(() => {
            result.current.syncOutputPorts(3)
        })

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
            outputAnchors: expect.arrayContaining([
                expect.objectContaining({ label: 'Condition 0' }),
                expect.objectContaining({ label: 'Condition 1' }),
                expect.objectContaining({ label: 'Condition 2' }),
                expect.objectContaining({ label: 'Else' })
            ])
        })
    })

    it('should generate only Else anchor for zero conditions', () => {
        const { result } = renderHook(() => useDynamicOutputPorts('node-1', 'Condition'))

        act(() => {
            result.current.syncOutputPorts(0)
        })

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
            outputAnchors: [{ id: 'node-1-output-0', name: '0', label: 'Else', type: 'Condition' }]
        })
    })

    it('should generate anchors with Scenario prefix', () => {
        const { result } = renderHook(() => useDynamicOutputPorts('node-1', 'Scenario'))

        act(() => {
            result.current.syncOutputPorts(2)
        })

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
            outputAnchors: [
                { id: 'node-1-output-0', name: '0', label: 'Scenario 0', type: 'Scenario' },
                { id: 'node-1-output-1', name: '1', label: 'Scenario 1', type: 'Scenario' },
                { id: 'node-1-output-2', name: '2', label: 'Else', type: 'Scenario' }
            ]
        })
    })

    it('should be inert when enabled is false', () => {
        const { result } = renderHook(() => useDynamicOutputPorts('node-1', 'Condition', false))

        act(() => {
            result.current.syncOutputPorts(2)
        })

        expect(mockUpdateNodeData).not.toHaveBeenCalled()
        expect(mockUpdateNodeInternals).not.toHaveBeenCalled()
    })

    it('should remove orphaned edges when count decreases', () => {
        mockEdges = [
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-1', source: 'node-1', target: 'node-3', sourceHandle: 'node-1-output-1' },
            { id: 'edge-2', source: 'node-1', target: 'node-4', sourceHandle: 'node-1-output-2' },
            { id: 'edge-3', source: 'node-1', target: 'node-5', sourceHandle: 'node-1-output-3' },
            { id: 'edge-other', source: 'node-9', target: 'node-10', sourceHandle: 'node-9-output-0' }
        ]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1', 'Condition'))

        // Set initial count to 3 (outputs: 0, 1, 2, 3=Else)
        act(() => {
            result.current.syncOutputPorts(3)
        })

        mockSetEdges.mockClear()

        // Reduce to 1 (outputs: 0, 1=Else) — edges at index 2 and 3 should be removed
        act(() => {
            result.current.syncOutputPorts(1)
        })

        expect(mockSetEdges).toHaveBeenCalledWith([
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-1', source: 'node-1', target: 'node-3', sourceHandle: 'node-1-output-1' },
            { id: 'edge-other', source: 'node-9', target: 'node-10', sourceHandle: 'node-9-output-0' }
        ])
    })

    it('should not call setEdges when count increases', () => {
        mockEdges = [{ id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' }]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1', 'Condition'))

        act(() => {
            result.current.syncOutputPorts(1)
        })

        mockSetEdges.mockClear()

        act(() => {
            result.current.syncOutputPorts(3)
        })

        expect(mockSetEdges).not.toHaveBeenCalled()
    })
})
