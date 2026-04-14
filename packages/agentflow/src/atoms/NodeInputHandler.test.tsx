import { ComponentType } from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { type AsyncInputProps, type ConfigInputComponentProps, NodeInputHandler } from './NodeInputHandler'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('reactflow', () => ({
    Handle: () => null,
    Position: { Left: 'left' },
    useUpdateNodeInternals: () => jest.fn()
}))

jest.mock('./RichTextEditor.lazy', () => ({
    RichTextEditor: ({
        value,
        onChange,
        placeholder,
        disabled
    }: {
        value: string
        onChange: (v: string) => void
        placeholder?: string
        disabled?: boolean
    }) => (
        <textarea
            data-testid='rich-text-editor'
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || ''}
            disabled={disabled}
        />
    )
}))

jest.mock('./VariableInput', () => ({
    VariableInput: ({ suggestionItems }: { suggestionItems?: { id: string }[] }) => (
        <div data-testid='variable-input' data-suggestion-ids={JSON.stringify(suggestionItems?.map((i) => i.id))} />
    )
}))

jest.mock('@tabler/icons-react', () => ({
    IconArrowsMaximize: () => <span data-testid='icon-expand' />,
    IconCode: () => <span />,
    IconInfoCircle: () => <span data-testid='icon-info-circle' />,
    IconPencil: () => <span />,
    IconVariable: () => <span data-testid='icon-variable' />,
    IconRefresh: () => <span data-testid='icon-refresh' />
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
    type: 'string',
    optional: false,
    additionalParams: true,
    ...overrides
})

beforeEach(() => {
    jest.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NodeInputHandler – static types', () => {
    it('renders a text input for string type', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        expect(screen.getByRole('textbox')).toBeTruthy()
    })

    it('renders nothing for asyncOptions when no AsyncInputComponent provided', () => {
        const { container } = render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        // Without AsyncInputComponent, async types render nothing
        expect(container.querySelector('input')).toBeNull()
    })
})

describe('NodeInputHandler – expand dialog', () => {
    it('should render richtext inline and in expand dialog for multiline string field', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string', rows: 4 })}
                data={{ ...baseNodeData, inputs: { myField: 'Some long text' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        // Inline editor is a RichTextEditor
        const editors = screen.getAllByTestId('rich-text-editor')
        expect(editors[0]).toHaveValue('Some long text')

        // Expand opens a second RichTextEditor (not a plain textarea)
        fireEvent.click(screen.getByTitle('Expand'))
        const expandedEditors = screen.getAllByTestId('rich-text-editor')
        expect(expandedEditors).toHaveLength(2)
        expect(expandedEditors[1]).toHaveValue('Some long text')
        expect(screen.queryByTestId('expand-content-input')).not.toBeInTheDocument()
    })

    it('should save expanded richtext content via onDataChange on confirm', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string', rows: 4 })}
                data={{ ...baseNodeData, inputs: { myField: 'Original' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        fireEvent.click(screen.getByTitle('Expand'))

        // Target the expand dialog's editor (second instance)
        const editors = screen.getAllByTestId('rich-text-editor')
        fireEvent.change(editors[1], { target: { value: 'Expanded text' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: expect.objectContaining({ name: 'myField' }),
            newValue: 'Expanded text'
        })
    })

    it('should reflect updated data prop in expand dialog after rerender', () => {
        const param = makeParam({ type: 'string', rows: 4 })
        const initialData = { ...baseNodeData, inputs: { myField: '' } }

        const { rerender } = render(
            <NodeInputHandler inputParam={param} data={initialData} isAdditionalParams onDataChange={mockOnDataChange} />
        )

        // Simulate parent updating data after user types in inline editor
        const updatedData = { ...baseNodeData, inputs: { myField: '<p>Updated instructions</p>' } }
        rerender(<NodeInputHandler inputParam={param} data={updatedData} isAdditionalParams onDataChange={mockOnDataChange} />)

        // Open expand dialog — it should show the updated value, not the initial empty value
        fireEvent.click(screen.getByTitle('Expand'))
        const editors = screen.getAllByTestId('rich-text-editor')
        expect(editors[1]).toHaveValue('<p>Updated instructions</p>')
    })

    it('should not show expand icon for non-multiline string fields', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        expect(screen.queryByTitle('Expand')).not.toBeInTheDocument()
    })
})

describe('NodeInputHandler – async onChange wiring', () => {
    // A minimal AsyncInputComponent that exposes its onChange via a button.
    // This verifies that async dropdown value changes flow through to onDataChange,
    // which is what triggers field visibility re-evaluation in the parent (EditNodeDialog).
    const StubAsyncInput: ComponentType<AsyncInputProps> = ({ onChange }) => (
        <button data-testid='async-select' onClick={() => onChange('selected-value')}>
            Select
        </button>
    )

    it('calls onDataChange when asyncOptions fires onChange', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={StubAsyncInput}
            />
        )

        fireEvent.click(screen.getByTestId('async-select'))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: expect.objectContaining({ name: 'myField', type: 'asyncOptions' }),
            newValue: 'selected-value'
        })
    })

    it('calls onDataChange when asyncMultiOptions fires onChange', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncMultiOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={StubAsyncInput}
            />
        )

        fireEvent.click(screen.getByTestId('async-select'))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: expect.objectContaining({ name: 'myField', type: 'asyncMultiOptions' }),
            newValue: 'selected-value'
        })
    })
})

describe('NodeInputHandler – loadConfig rendering', () => {
    const StubAsyncInput: ComponentType<AsyncInputProps> = ({ onChange }) => (
        <button data-testid='async-select' onClick={() => onChange('selected-value')}>
            Select
        </button>
    )

    const StubConfigInput: ComponentType<ConfigInputComponentProps> = ({ inputParam }) => (
        <div data-testid={`config-input-${inputParam.name}`}>Config Accordion</div>
    )

    it('renders ConfigInputComponent when loadConfig is true and value exists', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions', loadConfig: true })}
                data={{ ...baseNodeData, inputs: { myField: 'chatOpenAI' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={StubAsyncInput}
                ConfigInputComponent={StubConfigInput}
                onConfigChange={jest.fn()}
            />
        )

        expect(screen.getByTestId('config-input-myField')).toBeTruthy()
    })

    it('does not render ConfigInputComponent when loadConfig is false', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions', loadConfig: false })}
                data={{ ...baseNodeData, inputs: { myField: 'chatOpenAI' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={StubAsyncInput}
                ConfigInputComponent={StubConfigInput}
                onConfigChange={jest.fn()}
            />
        )

        expect(screen.queryByTestId('config-input-myField')).toBeNull()
    })

    it('does not render ConfigInputComponent when value is empty', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions', loadConfig: true })}
                data={{ ...baseNodeData, inputs: { myField: '' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={StubAsyncInput}
                ConfigInputComponent={StubConfigInput}
                onConfigChange={jest.fn()}
            />
        )

        expect(screen.queryByTestId('config-input-myField')).toBeNull()
    })

    it('does not render ConfigInputComponent when component is not injected', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions', loadConfig: true })}
                data={{ ...baseNodeData, inputs: { myField: 'chatOpenAI' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={StubAsyncInput}
            />
        )

        expect(screen.queryByTestId('config-input-myField')).toBeNull()
    })

    it('does not render ConfigInputComponent when onConfigChange is not provided', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions', loadConfig: true })}
                data={{ ...baseNodeData, inputs: { myField: 'chatOpenAI' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={StubAsyncInput}
                ConfigInputComponent={StubConfigInput}
            />
        )

        expect(screen.queryByTestId('config-input-myField')).toBeNull()
    })
})

// Mock CodeInput and JsonInput to avoid pulling in heavy dependencies
jest.mock('./CodeInput', () => ({
    CodeInput: ({ value, language, disabled }: { value: string; language?: string; disabled?: boolean }) => (
        <textarea data-testid='code-input' data-language={language} value={value} readOnly={disabled} onChange={() => {}} />
    )
}))

jest.mock('./JsonInput', () => ({
    JsonInput: ({ value, disabled }: { value: string; disabled?: boolean }) => (
        <div data-testid='json-input' data-value={value} data-disabled={disabled} />
    )
}))

jest.mock('./VariablePicker', () => ({
    VariablePicker: ({ items, onSelect }: { items: Array<{ value: string }>; onSelect: (v: string) => void }) => (
        <div data-testid='select-variable'>
            {items.map((item, i) => (
                <button key={i} data-testid={`var-${item.value}`} onClick={() => onSelect(item.value)}>
                    {item.value}
                </button>
            ))}
        </div>
    )
}))

describe('NodeInputHandler – json type', () => {
    it('renders JsonInput for json type', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'json' })}
                data={{ ...baseNodeData, inputs: { myField: '{"key":"val"}' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        expect(screen.getByTestId('json-input')).toBeTruthy()
        expect(screen.getByTestId('json-input')).toHaveAttribute('data-value', '{"key":"val"}')
    })

    it('renders a button for json with acceptVariable and variableItems', () => {
        const variableItems = [{ label: 'question', value: '{{question}}', category: 'Chat Context' }]
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'json', acceptVariable: true, label: 'Override Config' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                variableItems={variableItems}
            />
        )

        expect(screen.getByRole('button', { name: 'Override Config' })).toBeTruthy()
        expect(screen.queryByTestId('json-input')).toBeNull()
    })

    it('renders inline JsonInput for json with acceptVariable but no variableItems', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'json', acceptVariable: true })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        expect(screen.getByTestId('json-input')).toBeTruthy()
    })
})

describe('NodeInputHandler – code type', () => {
    it('renders CodeInput for code type', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'code', codeLanguage: 'javascript' })}
                data={{ ...baseNodeData, inputs: { myField: 'const x = 1' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        const editor = screen.getByTestId('code-input')
        expect(editor).toBeTruthy()
        expect(editor).toHaveValue('const x = 1')
        expect(editor).toHaveAttribute('data-language', 'javascript')
    })

    it('shows expand icon for code type', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'code' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        expect(screen.getByTitle('Expand')).toBeTruthy()
    })

    it('shows See Example button when codeExample is set', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'code', codeExample: 'console.log("hi")' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        expect(screen.getByText('See Example')).toBeTruthy()
    })

    it('sets value to codeExample when See Example is clicked', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'code', codeExample: 'console.log("hi")' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        fireEvent.click(screen.getByText('See Example'))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: expect.objectContaining({ type: 'code' }),
            newValue: 'console.log("hi")'
        })
    })

    it('does not show See Example when no codeExample', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'code' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        expect(screen.queryByText('See Example')).toBeNull()
    })
})

describe('NodeInputHandler – variable popover', () => {
    it('shows variable icon when acceptVariable and variableItems are provided for string type', () => {
        const variableItems = [{ label: 'question', value: '{{question}}', category: 'Chat Context' }]
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string', acceptVariable: true })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                variableItems={variableItems}
            />
        )

        // The variable icon is rendered inside a Tooltip > IconButton
        expect(screen.getByTestId('icon-variable')).toBeTruthy()
    })

    it('does not show variable icon without acceptVariable', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        expect(screen.queryByTestId('icon-variable')).toBeNull()
    })

    it('does not show variable icon with empty variableItems', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string', acceptVariable: true })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                variableItems={[]}
            />
        )

        expect(screen.queryByTestId('icon-variable')).toBeNull()
    })

    it('deduplicates suggestionItem ids when variableItems share the same value', () => {
        // Two flow-state entries with the same key produce the same base id.
        // The first should keep its id; subsequent duplicates get a __N suffix.
        const variableItems = [
            { label: '$flow.state.myVar', value: '$flow.state.myVar', category: 'Flow State' },
            { label: '$flow.state.myVar', value: '$flow.state.myVar', category: 'Flow State' },
            { label: '$flow.state.other', value: '$flow.state.other', category: 'Flow State' }
        ]
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string', acceptVariable: true })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                variableItems={variableItems}
            />
        )

        const ids = JSON.parse(screen.getByTestId('variable-input').getAttribute('data-suggestion-ids')!)
        expect(ids).toEqual(['$flow.state.myVar', '$flow.state.myVar__1', '$flow.state.other'])
    })
})

describe('NodeInputHandler – credential type rendering', () => {
    const StubAsyncInput: ComponentType<AsyncInputProps> = ({ onChange }) => (
        <button data-testid='credential-select' onClick={() => onChange('cred-id-123')}>
            Select Credential
        </button>
    )

    it('renders AsyncInputComponent for credential type', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'credential', name: 'FLOWISE_CREDENTIAL_ID', credentialNames: ['awsApi'] })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={StubAsyncInput}
            />
        )

        expect(screen.getByTestId('credential-select')).toBeTruthy()
    })

    it('renders nothing for credential type when no AsyncInputComponent', () => {
        const { container } = render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'credential', name: 'FLOWISE_CREDENTIAL_ID', credentialNames: ['awsApi'] })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        expect(container.querySelector('button')).toBeNull()
    })

    it('calls onDataChange when credential onChange fires', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'credential', name: 'FLOWISE_CREDENTIAL_ID', credentialNames: ['awsApi'] })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={StubAsyncInput}
            />
        )

        fireEvent.click(screen.getByTestId('credential-select'))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: expect.objectContaining({ name: 'FLOWISE_CREDENTIAL_ID', type: 'credential' }),
            newValue: 'cred-id-123'
        })
    })
})
