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

    describe('Loop Back To – node selection and stale-value clearing', () => {
        it('selecting an existing node option emits the node name (not empty string)', async () => {
            mockNodes = [
                makeFlowNode('start_0', 'startAgentflow', 'Start'),
                makeFlowNode('agentAgentflow_0', 'agentAgentflow', 'Agent'),
                makeFlowNode('loop_0', 'loopAgentflow', 'Loop')
            ]
            mockEdges = [makeEdge('start_0', 'agentAgentflow_0'), makeEdge('agentAgentflow_0', 'loop_0')]

            const mockChange = jest.fn()
            render(<AsyncInput inputParam={loopBackToNode} value='' disabled={false} onChange={mockChange} nodeId='loop_0' />)

            // Open dropdown and click the 'Agent' option
            fireEvent.mouseDown(screen.getByRole('combobox'))
            await waitFor(() => screen.getByText('Agent'))
            fireEvent.click(screen.getByText('Agent'))

            expect(mockChange).toHaveBeenCalledWith('agentAgentflow_0-Agent')
            expect(mockChange).not.toHaveBeenCalledWith('')
        })

        it('clears a stale value when the referenced node is deleted from the flow', async () => {
            // loop_0 has no ancestors (simulating the Agent node having been deleted)
            mockNodes = [makeFlowNode('loop_0', 'loopAgentflow', 'Loop')]
            mockEdges = []

            const mockChange = jest.fn()
            render(
                <AsyncInput
                    inputParam={loopBackToNode}
                    value='agentAgentflow_0-Agent'
                    disabled={false}
                    onChange={mockChange}
                    nodeId='loop_0'
                />
            )

            // 'agentAgentflow_0-Agent' is no longer in options → should be cleared
            await waitFor(() => expect(mockChange).toHaveBeenCalledWith(''))
        })

        it('does not clear value when the referenced node still exists', async () => {
            mockNodes = [
                makeFlowNode('start_0', 'startAgentflow', 'Start'),
                makeFlowNode('agentAgentflow_0', 'agentAgentflow', 'Agent'),
                makeFlowNode('loop_0', 'loopAgentflow', 'Loop')
            ]
            mockEdges = [makeEdge('start_0', 'agentAgentflow_0'), makeEdge('agentAgentflow_0', 'loop_0')]

            const mockChange = jest.fn()
            render(
                <AsyncInput
                    inputParam={loopBackToNode}
                    value='agentAgentflow_0-Agent'
                    disabled={false}
                    onChange={mockChange}
                    nodeId='loop_0'
                />
            )

            await act(async () => {})
            expect(mockChange).not.toHaveBeenCalledWith('')
        })
    })
})
