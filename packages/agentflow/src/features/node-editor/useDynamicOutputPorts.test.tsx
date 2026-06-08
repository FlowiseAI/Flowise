import { act, renderHook } from '@testing-library/react'

import { useDynamicOutputPorts } from './useDynamicOutputPorts'

// --- Mocks ---
const mockUpdateNodeInternals = jest.fn()
let mockEdges: Array<{ id: string; source: string; target: string; sourceHandle?: string }> = []

jest.mock('reactflow', () => ({
    useUpdateNodeInternals: () => mockUpdateNodeInternals
}))

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: { edges: mockEdges }
    })
}))

describe('useDynamicOutputPorts', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockEdges = []
    })

    it('should return cleaned edges removing orphaned handles', () => {
        mockEdges = [
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-1', source: 'node-1', target: 'node-3', sourceHandle: 'node-1-output-1' },
            { id: 'edge-2', source: 'node-1', target: 'node-4', sourceHandle: 'node-1-output-2' },
            { id: 'edge-3', source: 'node-1', target: 'node-5', sourceHandle: 'node-1-output-3' },
            { id: 'edge-other', source: 'node-9', target: 'node-10', sourceHandle: 'node-9-output-0' }
        ]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1'))

        // count=1, includeElse=true → totalNewAnchors=2 → keep indices 0,1 only
        let cleanedEdges: ReturnType<typeof result.current.cleanupOrphanedEdges>
        act(() => {
            cleanedEdges = result.current.cleanupOrphanedEdges(1)
        })

        expect(cleanedEdges!).toEqual([
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-1', source: 'node-1', target: 'node-3', sourceHandle: 'node-1-output-1' },
            { id: 'edge-other', source: 'node-9', target: 'node-10', sourceHandle: 'node-9-output-0' }
        ])
    })

    it('should call updateNodeInternals', () => {
        const { result } = renderHook(() => useDynamicOutputPorts('node-1'))

        act(() => {
            result.current.cleanupOrphanedEdges(2)
        })

        expect(mockUpdateNodeInternals).toHaveBeenCalledWith('node-1')
    })

    it('should return undefined when no edges are removed', () => {
        mockEdges = [{ id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' }]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1'))

        // count=3, includeElse=true → totalNewAnchors=4, edge at index 0 is fine
        let cleanedEdges: ReturnType<typeof result.current.cleanupOrphanedEdges>
        act(() => {
            cleanedEdges = result.current.cleanupOrphanedEdges(3)
        })

        expect(cleanedEdges!).toBeUndefined()
    })

    it('should return undefined when enabled is false', () => {
        mockEdges = [
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-1', source: 'node-1', target: 'node-3', sourceHandle: 'node-1-output-1' }
        ]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1', false))

        let cleanedEdges: ReturnType<typeof result.current.cleanupOrphanedEdges>
        act(() => {
            cleanedEdges = result.current.cleanupOrphanedEdges(0)
        })

        expect(cleanedEdges!).toBeUndefined()
        expect(mockUpdateNodeInternals).not.toHaveBeenCalled()
    })

    it('should preserve edges from other nodes and edges without sourceHandle', () => {
        mockEdges = [
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-1', source: 'node-1', target: 'node-3', sourceHandle: 'node-1-output-1' },
            { id: 'edge-other', source: 'node-9', target: 'node-10', sourceHandle: 'node-9-output-0' },
            { id: 'edge-no-handle', source: 'node-1', target: 'node-5' }
        ]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1'))

        // count=0, includeElse=true → totalNewAnchors=1 → keep only index 0
        let cleanedEdges: ReturnType<typeof result.current.cleanupOrphanedEdges>
        act(() => {
            cleanedEdges = result.current.cleanupOrphanedEdges(0)
        })

        expect(cleanedEdges!).toEqual([
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-other', source: 'node-9', target: 'node-10', sourceHandle: 'node-9-output-0' },
            { id: 'edge-no-handle', source: 'node-1', target: 'node-5' }
        ])
    })

    it('should respect includeElse=false for conditionAgent nodes', () => {
        mockEdges = [
            { id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' },
            { id: 'edge-1', source: 'node-1', target: 'node-3', sourceHandle: 'node-1-output-1' }
        ]

        const { result } = renderHook(() => useDynamicOutputPorts('node-1', true, false))

        // count=1, includeElse=false → totalNewAnchors=1 → keep only index 0
        let cleanedEdges: ReturnType<typeof result.current.cleanupOrphanedEdges>
        act(() => {
            cleanedEdges = result.current.cleanupOrphanedEdges(1)
        })

        expect(cleanedEdges!).toEqual([{ id: 'edge-0', source: 'node-1', target: 'node-2', sourceHandle: 'node-1-output-0' }])
    })
})
