import { makeFlowNode } from '@test-utils/factories'
import { renderHook } from '@testing-library/react'

import { useOpenNodeEditor } from './useOpenNodeEditor'

const mockOpenEditDialog = jest.fn()

// jest.mock() calls are hoisted above these `let` declarations, but this works because
// the mock factories return functions (late binding) — mockNodes and mockAvailableNodes
// are read at call time (during render), not when the factory is defined.
jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: { nodes: mockNodes },
        openEditDialog: mockOpenEditDialog
    })
}))

jest.mock('./useFlowNodes', () => ({
    useFlowNodes: () => ({ availableNodes: mockAvailableNodes })
}))

let mockNodes: ReturnType<typeof makeFlowNode>[] = []
let mockAvailableNodes: { name: string; inputs?: { name: string }[] }[] = []

describe('useOpenNodeEditor', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockNodes = [
            makeFlowNode('node-1', {
                data: { name: 'llmAgentflow', label: 'LLM', inputValues: { model: 'gpt-4' } }
            }),
            makeFlowNode('node-2', {
                data: { name: 'toolAgentflow', label: 'Tool' }
            })
        ]
        mockAvailableNodes = [
            { name: 'llmAgentflow', inputs: [{ name: 'model' }] },
            { name: 'toolAgentflow', inputs: [{ name: 'toolName' }] }
        ]
    })

    it('should open edit dialog with node data and input params', () => {
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-1')

        expect(mockOpenEditDialog).toHaveBeenCalledWith(
            'node-1',
            expect.objectContaining({ name: 'llmAgentflow', inputValues: { model: 'gpt-4' } }),
            [{ name: 'model' }]
        )
    })

    it('should initialize inputValues to empty object if missing', () => {
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-2')

        expect(mockOpenEditDialog).toHaveBeenCalledWith('node-2', expect.objectContaining({ name: 'toolAgentflow', inputValues: {} }), [
            { name: 'toolName' }
        ])
    })

    it('should not call openEditDialog when node is not found', () => {
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('nonexistent')

        expect(mockOpenEditDialog).not.toHaveBeenCalled()
    })

    it('should not call openEditDialog when node schema is not found', () => {
        mockAvailableNodes = [] // no schemas
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-1')

        expect(mockOpenEditDialog).not.toHaveBeenCalled()
    })

    it('should default inputs to empty array when schema has no inputs', () => {
        mockAvailableNodes = [{ name: 'llmAgentflow' }] // no inputs property
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-1')

        expect(mockOpenEditDialog).toHaveBeenCalledWith('node-1', expect.anything(), [])
    })
})
