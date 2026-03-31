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
let mockAvailableNodes: { name: string; inputs?: { name: string }[]; credential?: { name: string; type: string } }[] = []

describe('useOpenNodeEditor', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockNodes = [
            makeFlowNode('node-1', {
                data: { id: 'node-1', name: 'llmAgentflow', label: 'LLM', inputs: { model: 'gpt-4' } }
            }),
            makeFlowNode('node-2', {
                data: { id: 'node-2', name: 'toolAgentflow', label: 'Tool' }
            }),
            makeFlowNode('node-3', {
                data: {
                    id: 'node-3',
                    name: 'customNode',
                    label: 'Custom',
                    inputParams: [{ id: 'customField', name: 'customField', label: 'Custom Field', type: 'string' }],
                    inputs: { customField: 'hello' }
                }
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
            expect.objectContaining({ name: 'llmAgentflow', inputs: { model: 'gpt-4' } }),
            [{ name: 'model' }]
        )
    })

    it('should initialize inputs to empty object if missing', () => {
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-2')

        expect(mockOpenEditDialog).toHaveBeenCalledWith('node-2', expect.objectContaining({ name: 'toolAgentflow', inputs: {} }), [
            { name: 'toolName' }
        ])
    })

    it('should not call openEditDialog when node is not found', () => {
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('nonexistent')

        expect(mockOpenEditDialog).not.toHaveBeenCalled()
    })

    it('should fall back to node.data.inputParams when API schema is not found', () => {
        mockAvailableNodes = [] // no schemas
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-3')

        expect(mockOpenEditDialog).toHaveBeenCalledWith(
            'node-3',
            expect.objectContaining({ name: 'customNode', inputs: { customField: 'hello' } }),
            [{ id: 'customField', name: 'customField', label: 'Custom Field', type: 'string' }]
        )
    })

    it('should open dialog with empty inputs when neither API schema nor data.inputs exist', () => {
        mockAvailableNodes = [] // no schemas
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-1') // node-1 has no data.inputs

        expect(mockOpenEditDialog).toHaveBeenCalledWith(
            'node-1',
            expect.objectContaining({ name: 'llmAgentflow', inputs: { model: 'gpt-4' } }),
            []
        )
    })

    it('should prioritize API schema inputs over node.data.inputs', () => {
        // node-3 has data.inputs, but let's also add an API schema for it
        mockAvailableNodes.push({ name: 'customNode', inputs: [{ name: 'apiField' }] })
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-3')

        expect(mockOpenEditDialog).toHaveBeenCalledWith(
            'node-3',
            expect.objectContaining({ name: 'customNode' }),
            [{ name: 'apiField' }] // API schema wins over data.inputs
        )
    })

    it('should prepend credential param to inputParams when schema has credential', () => {
        mockAvailableNodes = [
            {
                name: 'llmAgentflow',
                inputs: [{ name: 'model' }],
                credential: { name: 'credential', type: 'credential' }
            }
        ]
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-1')

        expect(mockOpenEditDialog).toHaveBeenCalledWith('node-1', expect.objectContaining({ name: 'llmAgentflow' }), [
            { name: 'credential', type: 'credential' },
            { name: 'model' }
        ])
    })

    it('should not prepend credential when schema has no credential', () => {
        mockAvailableNodes = [{ name: 'llmAgentflow', inputs: [{ name: 'model' }] }]
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-1')

        expect(mockOpenEditDialog).toHaveBeenCalledWith('node-1', expect.objectContaining({ name: 'llmAgentflow' }), [{ name: 'model' }])
    })

    it('should open dialog with empty inputs when schema has no inputs', () => {
        mockAvailableNodes = [{ name: 'llmAgentflow' }] // no inputs property
        const { result } = renderHook(() => useOpenNodeEditor())
        result.current.openNodeEditor('node-1')

        expect(mockOpenEditDialog).toHaveBeenCalledWith(
            'node-1',
            expect.objectContaining({ name: 'llmAgentflow', inputs: { model: 'gpt-4' } }),
            []
        )
    })
})
