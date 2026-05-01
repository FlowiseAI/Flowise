/**
 * Tests for Loop node input rendering and freeSolo behavior.
 * Covers the four inputs defined in packages/components/nodes/agentflow/Loop/Loop.ts:
 *   loopBackToNode  (asyncOptions / listPreviousNodes / freeSolo: true)
 *   maxLoopCount    (number, default 5)
 *   fallbackMessage (string / rows / acceptVariable)
 *   loopUpdateState (array)
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { NodeInputHandler } from '@/atoms'
import type { InputParam, NodeData } from '@/core/types'

import { AsyncInput } from './AsyncInput'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('reactflow', () => ({
    Handle: () => null,
    Position: { Left: 'left' },
    useUpdateNodeInternals: () => jest.fn()
}))

jest.mock('@tabler/icons-react', () => ({
    IconArrowsMaximize: () => <span data-testid='icon-expand' />,
    IconEdit: () => <span data-testid='icon-edit' />,
    IconVariable: () => <span data-testid='icon-variable' />,
    IconRefresh: () => <span data-testid='icon-refresh' />
}))

// RichTextEditor is lazy-loaded; stub it to avoid jsdom issues
jest.mock('@/atoms/RichTextEditor.lazy', () => ({
    RichTextEditor: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
        <textarea data-testid='rich-text-editor' value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    )
}))

// ArrayInput is tested separately; stub it to keep loop tests focused
jest.mock('@/atoms/ArrayInput', () => ({
    __esModule: true,
    default: () => <div data-testid='array-input' />
}))

// listPreviousNodes bypasses useAsyncOptions — this mock should never be called
jest.mock('@/infrastructure/api/hooks', () => ({
    useAsyncOptions: jest.fn(() => {
        throw new Error('useAsyncOptions should not be called for listPreviousNodes')
    })
}))

let mockNodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }> = []
let mockEdges: Array<{ id: string; source: string; target: string; targetHandle?: string; type: string }> = []

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: { nodes: mockNodes, edges: mockEdges }
    })
}))

// ─── Loop node param definitions (mirrors Loop.ts) ───────────────────────────

const loopBackToNode: InputParam = {
    id: 'loopBackToNode',
    name: 'loopBackToNode',
    label: 'Loop Back To',
    type: 'asyncOptions',
    loadMethod: 'listPreviousNodes',
    freeSolo: true,
    additionalParams: true
}

const maxLoopCount: InputParam = {
    id: 'maxLoopCount',
    name: 'maxLoopCount',
    label: 'Max Loop Count',
    type: 'number',
    default: 5,
    additionalParams: true
}

const fallbackMessage: InputParam = {
    id: 'fallbackMessage',
    name: 'fallbackMessage',
    label: 'Fallback Message',
    type: 'string',
    rows: 4,
    acceptVariable: true,
    optional: true,
    additionalParams: true
}

const loopUpdateState: InputParam = {
    id: 'loopUpdateState',
    name: 'loopUpdateState',
    label: 'Update Flow State',
    type: 'array',
    optional: true,
    acceptVariable: true,
    additionalParams: true,
    array: [
        { id: 'key', name: 'key', label: 'Key', type: 'asyncOptions', loadMethod: 'listRuntimeStateKeys' },
        { id: 'value', name: 'value', label: 'Value', type: 'string', acceptVariable: true, acceptNodeOutputAsVariable: true }
    ]
}

const loopNodeData: NodeData = {
    id: 'loop_0',
    name: 'loopAgentflow',
    label: 'Loop',
    inputs: {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeFlowNode = (id: string, name: string, label: string) => ({
    id,
    type: 'agentflowNode' as const,
    position: { x: 0, y: 0 },
    data: { name, label, inputs: {} }
})

const makeEdge = (source: string, target: string) => ({
    id: `${source}-${target}`,
    source,
    target,
    targetHandle: target,
    type: 'agentflowEdge'
})

beforeEach(() => {
    jest.clearAllMocks()
    mockNodes = []
    mockEdges = []
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Loop node', () => {
    describe('all 4 inputs render', () => {
        it('renders Loop Back To dropdown', () => {
            mockNodes = [makeFlowNode('loop_0', 'loopAgentflow', 'Loop')]

            render(<NodeInputHandler inputParam={loopBackToNode} data={loopNodeData} isAdditionalParams AsyncInputComponent={AsyncInput} />)

            expect(screen.getByText('Loop Back To')).toBeTruthy()
            expect(screen.getByRole('combobox')).toBeTruthy()
        })

        it('renders Max Loop Count number input with default value', () => {
            render(
                <NodeInputHandler inputParam={maxLoopCount} data={{ ...loopNodeData, inputs: { maxLoopCount: 5 } }} isAdditionalParams />
            )

            expect(screen.getByText('Max Loop Count')).toBeTruthy()
            // number inputs render as spinbutton in ARIA
            expect(screen.getByRole('spinbutton')).toBeTruthy()
        })

        it('renders Fallback Message as multiline editor', () => {
            render(<NodeInputHandler inputParam={fallbackMessage} data={loopNodeData} isAdditionalParams />)

            expect(screen.getByText('Fallback Message')).toBeTruthy()
            expect(screen.getByTestId('rich-text-editor')).toBeTruthy()
        })

        it('renders Update Flow State as array editor', () => {
            render(
                <NodeInputHandler inputParam={loopUpdateState} data={loopNodeData} isAdditionalParams AsyncInputComponent={AsyncInput} />
            )

            expect(screen.getByText('Update Flow State')).toBeTruthy()
            expect(screen.getByTestId('array-input')).toBeTruthy()
        })
    })

    describe('freeSolo – Loop Back To', () => {
        it('preserves user-typed free-text value (does not emit empty string)', async () => {
            mockNodes = [makeFlowNode('start_0', 'startAgentflow', 'Start'), makeFlowNode('loop_0', 'loopAgentflow', 'Loop')]
            mockEdges = [makeEdge('start_0', 'loop_0')]

            const mockChange = jest.fn()
            render(<AsyncInput inputParam={loopBackToNode} value='' disabled={false} onChange={mockChange} nodeId='loop_0' />)

            const input = screen.getByRole('combobox')
            fireEvent.change(input, { target: { value: 'custom-node-id' } })
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

            await waitFor(() => {
                const calls = mockChange.mock.calls
                // Should have been called with the typed text, not discarded as ''
                expect(calls.some(([v]) => v === 'custom-node-id')).toBe(true)
            })
            expect(mockChange).not.toHaveBeenCalledWith('')
        })

        it('displays a stored free-text value not in the options list', () => {
            mockNodes = [makeFlowNode('loop_0', 'loopAgentflow', 'Loop')]
            mockEdges = []

            render(<AsyncInput inputParam={loopBackToNode} value='my-custom-node' disabled={false} onChange={jest.fn()} nodeId='loop_0' />)

            const input = screen.getByRole('combobox') as HTMLInputElement
            expect(input.value).toBe('my-custom-node')
        })

        it('does NOT clear a free-text value when options change (freeSolo guard)', async () => {
            mockNodes = [makeFlowNode('start_0', 'startAgentflow', 'Start'), makeFlowNode('loop_0', 'loopAgentflow', 'Loop')]
            mockEdges = [makeEdge('start_0', 'loop_0')]

            const mockChange = jest.fn()
            render(
                <AsyncInput inputParam={loopBackToNode} value='my-custom-freetext' disabled={false} onChange={mockChange} nodeId='loop_0' />
            )

            // The stale-value effect runs after mount; with freeSolo=true it must not clear
            await act(async () => {})
            expect(mockChange).not.toHaveBeenCalledWith('')
        })

        it('still clears a stale option-based value when freeSolo is false', async () => {
            // loop_0 has no ancestors, so options = []
            mockNodes = [makeFlowNode('loop_0', 'loopAgentflow', 'Loop')]
            mockEdges = []

            const mockChange = jest.fn()
            render(
                <AsyncInput
                    inputParam={{ ...loopBackToNode, freeSolo: false }}
                    value='start_0-Start'
                    disabled={false}
                    onChange={mockChange}
                    nodeId='loop_0'
                />
            )

            // 'start_0-Start' is not in the empty options list → should be cleared
            await waitFor(() => expect(mockChange).toHaveBeenCalledWith(''))
        })
    })
})
