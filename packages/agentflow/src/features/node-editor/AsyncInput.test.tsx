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
    IconVariable: () => <span data-testid='icon-variable' />,
    IconRefresh: () => <span data-testid='icon-refresh' />
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockOnDataChange = jest.fn()

const baseNodeData: NodeData = {
    id: 'node-1',
    name: 'testNode',
    label: 'Test Node',
    inputValues: {}
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
            inputValues: { myField: 'gpt-4o' }
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
    it('passes undefined params when nodeName and inputValues are absent', () => {
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
})

describe('AsyncInput (direct) – asyncMultiOptions', () => {
    it('passes undefined params when nodeName and inputValues are absent', () => {
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
            inputValues: { myField: '["tool-a"]' }
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
            inputValues: { myField: '[not valid json' }
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
            inputValues: { myField: ['tool-a', 'tool-b'] }
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
