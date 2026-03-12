import { act, renderHook } from '@testing-library/react'

import { useDynamicOutputPorts } from './useDynamicOutputPorts'

// --- Mocks ---
const mockUpdateNodeInternals = jest.fn()
const mockSetEdges = jest.fn()
let mockEdges: Array<{ id: string; source: string; target: string; sourceHandle?: string }> = []

jest.mock('reactflow', () => ({
    useUpdateNodeInternals: () => mockUpdateNodeInternals
}))

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: { edges: mockEdges },
        setEdges: mockSetEdges
    })
}))

describe('useDynamicOutputPorts', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockEdges = []
    })

    it('should remove orphaned edges when count decreases', () => {
        mockEdges = [
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-1', source: 'node-1', target: 'node-3', sourceHandle: 'node-1-output-1' },
            { id: 'edge-2', source: 'node-1', target: 'node-4', sourceHandle: 'node-1-output-2' },
            { id: 'edge-3', source: 'node-1', target: 'node-5', sourceHandle: 'node-1-output-3' },
            { id: 'edge-other', source: 'node-9', target: 'node-10', sourceHandle: 'node-9-output-0' }
        ]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1'))

        // Set initial count to 3 (outputs: 0, 1, 2, 3=Else)
        act(() => {
            result.current.cleanupOrphanedEdges(3)
        })

        mockSetEdges.mockClear()

        // Reduce to 1 (outputs: 0, 1=Else) — edges at index 2 and 3 should be removed
        act(() => {
            result.current.cleanupOrphanedEdges(1)
        })

        expect(mockSetEdges).toHaveBeenCalledWith([
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-1', source: 'node-1', target: 'node-3', sourceHandle: 'node-1-output-1' },
            { id: 'edge-other', source: 'node-9', target: 'node-10', sourceHandle: 'node-9-output-0' }
        ])
    })

    it('should call updateNodeInternals after cleanup', () => {
        const { result } = renderHook(() => useDynamicOutputPorts('node-1'))

        act(() => {
            result.current.cleanupOrphanedEdges(2)
        })

        expect(mockUpdateNodeInternals).toHaveBeenCalledWith('node-1')
    })

    it('should not call setEdges when count increases', () => {
        mockEdges = [{ id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' }]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1'))

        // Set initial count
        act(() => {
            result.current.cleanupOrphanedEdges(1)
        })

        mockSetEdges.mockClear()

        // Increase count — no edges should be removed
        act(() => {
            result.current.cleanupOrphanedEdges(3)
        })

        expect(mockSetEdges).not.toHaveBeenCalled()
    })

    it('should not call setEdges on first call (no previous count)', () => {
        mockEdges = [{ id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' }]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1'))

        act(() => {
            result.current.cleanupOrphanedEdges(2)
        })

        expect(mockSetEdges).not.toHaveBeenCalled()
    })

    it('should be inert when enabled is false', () => {
        const { result } = renderHook(() => useDynamicOutputPorts('node-1', false))

        act(() => {
            result.current.cleanupOrphanedEdges(2)
        })

        expect(mockSetEdges).not.toHaveBeenCalled()
        expect(mockUpdateNodeInternals).not.toHaveBeenCalled()
    })

    it('should preserve edges from other nodes when cleaning up', () => {
        mockEdges = [
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-1', source: 'node-1', target: 'node-3', sourceHandle: 'node-1-output-1' },
            { id: 'edge-other', source: 'node-9', target: 'node-10', sourceHandle: 'node-9-output-0' },
            { id: 'edge-no-handle', source: 'node-1', target: 'node-5' }
        ]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1'))

        // Set initial count to 2
        act(() => {
            result.current.cleanupOrphanedEdges(2)
        })
        mockSetEdges.mockClear()

        // Reduce to 0 (only Else anchor at index 0)
        act(() => {
            result.current.cleanupOrphanedEdges(0)
        })

        expect(mockSetEdges).toHaveBeenCalledWith([
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-other', source: 'node-9', target: 'node-10', sourceHandle: 'node-9-output-0' },
            { id: 'edge-no-handle', source: 'node-1', target: 'node-5' }
        ])
    })
})
