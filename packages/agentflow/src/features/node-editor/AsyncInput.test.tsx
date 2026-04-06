import { fireEvent, render, screen, waitFor } from '@testing-library/react'

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

jest.mock('./CreateCredentialDialog', () => ({
    CreateCredentialDialog: ({
        open,
        onCreated,
        onClose,
        editCredentialId
    }: {
        open: boolean
        onCreated: (id: string) => void
        onClose: () => void
        editCredentialId?: string
    }) =>
        open ? (
            <div data-testid={editCredentialId ? 'edit-credential-dialog' : 'create-credential-dialog'}>
                <button onClick={() => onCreated(editCredentialId ?? 'new-cred-id')}>{editCredentialId ? 'Save' : 'Create'}</button>
                <button onClick={onClose}>Close</button>
            </div>
        ) : null
}))

interface MockAsyncResult {
    options: Array<{ label: string; name: string; imageSrc?: string; description?: string }>
    loading: boolean
    error: string | null
    refetch: () => void
}

const mockRefetch = jest.fn()

// Typed mock so mockReturnValue accepts the full return shape without 'never' errors
const mockUseAsyncOptions = jest.fn<MockAsyncResult, [unknown]>(() => ({
    options: [] as Array<{ label: string; name: string }>,
    loading: true,
    error: null,
    refetch: mockRefetch
}))

jest.mock('@/infrastructure/api/hooks', () => ({
    // Single-arg wrapper avoids the "spread of unknown[]" TS error
    useAsyncOptions: (arg: unknown) => mockUseAsyncOptions(arg)
}))

let mockNodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }> = []

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: { nodes: mockNodes, edges: [] }
    })
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockOnDataChange = jest.fn()

const baseNodeData: NodeData = {
    id: 'node-1',
    name: 'testNode',
    label: 'Test Node',
    inputs: {}
}

const makeParam = (overrides: Partial<InputParam>): InputParam => ({
    id: 'p1',
    name: 'myField',
    label: 'My Field',
    type: 'asyncOptions',
    optional: false,
    additionalParams: true,
    ...overrides
})

const idleResult = (): MockAsyncResult => ({ options: [], loading: false, error: null, refetch: mockRefetch })

beforeEach(() => {
    jest.clearAllMocks()
    mockNodes = []
    mockUseAsyncOptions.mockReturnValue({ options: [], loading: true, error: null, refetch: mockRefetch })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NodeInputHandler – asyncOptions', () => {
    it('renders loading spinner while options are loading', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        // CircularProgress is rendered inside the Autocomplete endAdornment
        expect(document.querySelector('.MuiCircularProgress-root')).toBeTruthy()
    })

    it('renders Autocomplete with options after loading', () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [
                { label: 'GPT-4o', name: 'gpt-4o' },
                { label: 'Claude 3', name: 'claude-3' }
            ]
        })

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        expect(screen.getByRole('combobox')).toBeTruthy()
    })

    it('calls onDataChange with option.name when selection changes', async () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'GPT-4o', name: 'gpt-4o' }]
        })

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        const input = screen.getByRole('combobox')
        fireEvent.change(input, { target: { value: 'GPT' } })
        await waitFor(() => screen.getByText('GPT-4o'))
        fireEvent.click(screen.getByText('GPT-4o'))

        expect(mockOnDataChange).toHaveBeenCalledWith(expect.objectContaining({ newValue: 'gpt-4o' }))
    })

    it('renders error message and retry button on API failure', () => {
        mockUseAsyncOptions.mockReturnValue({ ...idleResult(), error: 'Network failure' })

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        expect(screen.getByText('Network failure')).toBeTruthy()
        expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
    })

    it('retry button calls refetch', () => {
        mockUseAsyncOptions.mockReturnValue({ ...idleResult(), error: 'Network failure' })

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        fireEvent.click(screen.getByRole('button', { name: /retry/i }))
        expect(mockRefetch).toHaveBeenCalledTimes(1)
    })

    it('shows no-options text when loaded with empty list', async () => {
        mockUseAsyncOptions.mockReturnValue(idleResult())

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        // mouseDown opens the MUI Autocomplete popup
        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => expect(screen.getByText('No options available')).toBeTruthy())
    })

    it('marks pre-selected option as selected when dropdown is opened', async () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [
                { label: 'GPT-4o', name: 'gpt-4o' },
                { label: 'Claude 3', name: 'claude-3' }
            ]
        })

        const nodeDataWithValue: NodeData = {
            ...baseNodeData,
            inputs: { myField: 'gpt-4o' }
        }

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions' })}
                data={nodeDataWithValue}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        // Opening the dropdown with a pre-selected value triggers isOptionEqualToValue
        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => expect(screen.getByText('GPT-4o')).toBeTruthy())
    })
})

describe('AsyncInput (direct) – asyncOptions', () => {
    it('passes undefined params when nodeName and inputs are absent', () => {
        mockUseAsyncOptions.mockReturnValue(idleResult())

        render(<AsyncInput inputParam={makeParam({ type: 'asyncOptions' })} value='' disabled={false} onChange={jest.fn()} />)

        expect(mockUseAsyncOptions).toHaveBeenCalledWith(expect.objectContaining({ params: undefined }))
    })

    it('calls onChange with empty string when selection is cleared', async () => {
        const mockChange = jest.fn()
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'GPT-4o', name: 'gpt-4o' }]
        })

        render(<AsyncInput inputParam={makeParam({ type: 'asyncOptions' })} value='gpt-4o' disabled={false} onChange={mockChange} />)

        const clearButton = screen.getByTitle('Clear')
        fireEvent.click(clearButton)

        expect(mockChange).toHaveBeenCalledWith('')
    })

    it('renders option image and description when present in renderOption', async () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'GPT-4o', name: 'gpt-4o', imageSrc: 'http://test/icon.png', description: 'OpenAI model' }]
        })

        render(<AsyncInput inputParam={makeParam({ type: 'asyncOptions' })} value='' disabled={false} onChange={jest.fn()} />)

        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => {
            expect(screen.getByAltText('GPT-4o')).toBeTruthy()
            expect(screen.getByText('OpenAI model')).toBeTruthy()
        })
    })

    it('renders selected option image in renderInput when imageSrc is present', async () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'GPT-4o', name: 'gpt-4o', imageSrc: 'http://test/icon.png' }]
        })

        render(<AsyncInput inputParam={makeParam({ type: 'asyncOptions' })} value='gpt-4o' disabled={false} onChange={jest.fn()} />)

        // The selected option's image appears in the input adornment
        await waitFor(() => expect(screen.getByAltText('GPT-4o')).toBeTruthy())
    })

    it('clears stored value when it no longer matches any available option', async () => {
        const mockChange = jest.fn()
        // Options do NOT include the currently selected value
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'otherKey', name: 'otherKey' }]
        })

        render(<AsyncInput inputParam={makeParam({ type: 'asyncOptions' })} value='removedKey' disabled={false} onChange={mockChange} />)

        await waitFor(() => {
            expect(mockChange).toHaveBeenCalledWith('')
        })
    })

    it('passes stateKeys from Start node for listRuntimeStateKeys loadMethod', () => {
        mockNodes = [
            {
                id: 'start_0',
                type: 'agentflowNode',
                position: { x: 0, y: 0 },
                data: {
                    name: 'startAgentflow',
                    inputs: {
                        startState: [
                            { key: 'userName', value: '' },
                            { key: 'count', value: '0' }
                        ]
                    }
                }
            }
        ]
        mockUseAsyncOptions.mockReturnValue(idleResult())

        render(
            <AsyncInput
                inputParam={makeParam({ type: 'asyncOptions', loadMethod: 'listRuntimeStateKeys' })}
                value=''
                disabled={false}
                onChange={jest.fn()}
            />
        )

        expect(mockUseAsyncOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({ stateKeys: ['count', 'userName'] })
            })
        )
    })

    it('excludes keys from the current node to prevent circular self-reference', () => {
        mockNodes = [
            {
                id: 'start_0',
                type: 'agentflowNode',
                position: { x: 0, y: 0 },
                data: {
                    name: 'startAgentflow',
                    inputs: { startState: [{ key: 'fromStart', value: '' }] }
                }
            },
            {
                id: 'agent_0',
                type: 'agentflowNode',
                position: { x: 0, y: 0 },
                data: {
                    name: 'agentAgentflow',
                    inputs: {
                        agentUpdateState: [{ key: 'selfKey', value: 'v1' }]
                    }
                }
            }
        ]
        mockUseAsyncOptions.mockReturnValue(idleResult())

        // nodeName='agentAgentflow' — should exclude the agent's own keys
        render(
            <AsyncInput
                inputParam={makeParam({ type: 'asyncOptions', loadMethod: 'listRuntimeStateKeys' })}
                value=''
                disabled={false}
                onChange={jest.fn()}
                nodeName='agentAgentflow'
            />
        )

        expect(mockUseAsyncOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                // Only Start node key included; agent's own 'selfKey' excluded
                params: expect.objectContaining({ stateKeys: ['fromStart'] })
            })
        )
    })
})

describe('AsyncInput (direct) – asyncMultiOptions', () => {
    it('passes undefined params when nodeName and inputs are absent', () => {
        mockUseAsyncOptions.mockReturnValue(idleResult())

        render(<AsyncInput inputParam={makeParam({ type: 'asyncMultiOptions' })} value='' disabled={false} onChange={jest.fn()} />)

        expect(mockUseAsyncOptions).toHaveBeenCalledWith(expect.objectContaining({ params: undefined }))
    })

    it('renders option image and description when present in renderOption', async () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'Tool A', name: 'tool-a', imageSrc: 'http://test/icon.png', description: 'A useful tool' }]
        })

        render(<AsyncInput inputParam={makeParam({ type: 'asyncMultiOptions' })} value='' disabled={false} onChange={jest.fn()} />)

        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => {
            expect(screen.getByAltText('Tool A')).toBeTruthy()
            expect(screen.getByText('A useful tool')).toBeTruthy()
        })
    })
})

describe('NodeInputHandler – asyncMultiOptions', () => {
    it('calls onDataChange with JSON array string when multiple options selected', async () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [
                { label: 'Tool A', name: 'tool-a' },
                { label: 'Tool B', name: 'tool-b' }
            ]
        })

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncMultiOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        const input = screen.getByRole('combobox')
        fireEvent.change(input, { target: { value: 'Tool' } })
        await waitFor(() => screen.getByText('Tool A'))
        fireEvent.click(screen.getByText('Tool A'))

        expect(mockOnDataChange).toHaveBeenCalledWith(expect.objectContaining({ newValue: '["tool-a"]' }))
    })

    it('calls onDataChange with empty string when all selections cleared', async () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'Tool A', name: 'tool-a' }]
        })

        const nodeDataWithValue: NodeData = {
            ...baseNodeData,
            inputs: { myField: '["tool-a"]' }
        }

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncMultiOptions' })}
                data={nodeDataWithValue}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        // The MUI Autocomplete clear button (title="Clear") clears all selections
        const clearButton = screen.getByTitle('Clear')
        fireEvent.click(clearButton)

        expect(mockOnDataChange).toHaveBeenCalledWith(expect.objectContaining({ newValue: '' }))
    })

    it('renders error message and retry button on API failure', () => {
        mockUseAsyncOptions.mockReturnValue({ ...idleResult(), error: 'Network failure' })

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncMultiOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        expect(screen.getByText('Network failure')).toBeTruthy()
        expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
    })

    it('renders without crashing when value is a malformed JSON string', () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'Tool A', name: 'tool-a' }]
        })

        const nodeDataWithBadValue: NodeData = {
            ...baseNodeData,
            inputs: { myField: '[not valid json' }
        }

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncMultiOptions' })}
                data={nodeDataWithBadValue}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        // Falls back to empty selection — combobox still renders
        expect(screen.getByRole('combobox')).toBeTruthy()
    })

    it('renders pre-selected chips when value is passed as an array', () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [
                { label: 'Tool A', name: 'tool-a' },
                { label: 'Tool B', name: 'tool-b' }
            ]
        })

        const nodeDataWithArrayValue: NodeData = {
            ...baseNodeData,
            inputs: { myField: ['tool-a', 'tool-b'] }
        }

        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncMultiOptions' })}
                data={nodeDataWithArrayValue}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={AsyncInput}
            />
        )

        expect(screen.getByText('Tool A')).toBeTruthy()
        expect(screen.getByText('Tool B')).toBeTruthy()
    })
})

describe('AsyncInput – Create New credential', () => {
    it('"- Create New -" option appears when credentialNames is set', async () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'My API Key', name: 'cred-1' }]
        })

        render(
            <AsyncInput
                inputParam={makeParam({ type: 'asyncOptions', credentialNames: ['openAIApi'] })}
                value=''
                disabled={false}
                onChange={jest.fn()}
            />
        )

        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => {
            expect(screen.getByText('- Create New -')).toBeTruthy()
        })
    })

    it('"- Create New -" does NOT appear for non-credential async dropdowns', async () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'GPT-4o', name: 'gpt-4o' }]
        })

        render(<AsyncInput inputParam={makeParam({ type: 'asyncOptions' })} value='' disabled={false} onChange={jest.fn()} />)

        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => {
            expect(screen.getByText('GPT-4o')).toBeTruthy()
        })
        expect(screen.queryByText('- Create New -')).toBeNull()
    })

    it('selecting "- Create New -" opens CreateCredentialDialog and does not call onChange', async () => {
        const mockChange = jest.fn()
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'My API Key', name: 'cred-1' }]
        })

        render(
            <AsyncInput
                inputParam={makeParam({ type: 'asyncOptions', credentialNames: ['openAIApi'] })}
                value=''
                disabled={false}
                onChange={mockChange}
            />
        )

        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => screen.getByText('- Create New -'))
        fireEvent.click(screen.getByText('- Create New -'))

        expect(mockChange).not.toHaveBeenCalled()
        expect(screen.getByTestId('create-credential-dialog')).toBeTruthy()
    })

    it('after credential creation, onChange is called with new ID and component remounts to refetch', async () => {
        const mockChange = jest.fn()
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'My API Key', name: 'cred-1' }]
        })

        render(
            <AsyncInput
                inputParam={makeParam({ type: 'asyncOptions', credentialNames: ['openAIApi'] })}
                value=''
                disabled={false}
                onChange={mockChange}
            />
        )

        const initialCallCount = mockUseAsyncOptions.mock.calls.length

        // Open dropdown and select "- Create New -"
        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => screen.getByText('- Create New -'))
        fireEvent.click(screen.getByText('- Create New -'))

        // Click the Create button in the mocked dialog
        fireEvent.click(screen.getByText('Create'))

        expect(mockChange).toHaveBeenCalledWith('new-cred-id')
        // The inner dropdown component remounts (via key change), re-running useAsyncOptions
        expect(mockUseAsyncOptions.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
})

describe('AsyncInput – Edit credential', () => {
    it('edit button does NOT appear when no credential is selected', () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'My API Key', name: 'cred-1' }]
        })

        render(
            <AsyncInput
                inputParam={makeParam({ type: 'asyncOptions', credentialNames: ['openAIApi'] })}
                value=''
                disabled={false}
                onChange={jest.fn()}
            />
        )

        expect(screen.queryByTitle('Edit Credential')).toBeNull()
    })

    it('edit button appears when a credential is selected', () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'My API Key', name: 'cred-1' }]
        })

        render(
            <AsyncInput
                inputParam={makeParam({ type: 'asyncOptions', credentialNames: ['openAIApi'] })}
                value='cred-1'
                disabled={false}
                onChange={jest.fn()}
            />
        )

        expect(screen.getByTitle('Edit Credential')).toBeTruthy()
    })

    it('edit button does NOT appear for non-credential async dropdowns', () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'GPT-4o', name: 'gpt-4o' }]
        })

        render(<AsyncInput inputParam={makeParam({ type: 'asyncOptions' })} value='gpt-4o' disabled={false} onChange={jest.fn()} />)

        expect(screen.queryByTitle('Edit Credential')).toBeNull()
    })

    it('clicking edit button opens the edit dialog', () => {
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'My API Key', name: 'cred-1' }]
        })

        render(
            <AsyncInput
                inputParam={makeParam({ type: 'asyncOptions', credentialNames: ['openAIApi'] })}
                value='cred-1'
                disabled={false}
                onChange={jest.fn()}
            />
        )

        fireEvent.click(screen.getByTitle('Edit Credential'))
        expect(screen.getByTestId('edit-credential-dialog')).toBeTruthy()
    })

    it('after editing, onChange is called with credential ID and component remounts to refetch', () => {
        const mockChange = jest.fn()
        mockUseAsyncOptions.mockReturnValue({
            ...idleResult(),
            options: [{ label: 'My API Key', name: 'cred-1' }]
        })

        render(
            <AsyncInput
                inputParam={makeParam({ type: 'asyncOptions', credentialNames: ['openAIApi'] })}
                value='cred-1'
                disabled={false}
                onChange={mockChange}
            />
        )

        const initialCallCount = mockUseAsyncOptions.mock.calls.length

        fireEvent.click(screen.getByTitle('Edit Credential'))
        fireEvent.click(screen.getByText('Save'))

        expect(mockChange).toHaveBeenCalledWith('cred-1')
        expect(mockUseAsyncOptions.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
})
