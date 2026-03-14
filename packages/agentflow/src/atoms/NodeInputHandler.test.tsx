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

jest.mock('@tabler/icons-react', () => ({
    IconArrowsMaximize: () => <span data-testid='icon-expand' />,
    IconVariable: () => <span data-testid='icon-variable' />,
    IconRefresh: () => <span data-testid='icon-refresh' />
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
    it('should open expand dialog when expand icon is clicked on multiline string field', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string', rows: 4 })}
                data={{ ...baseNodeData, inputValues: { myField: 'Some long text' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        fireEvent.click(screen.getByTitle('Expand'))

        const expandInput = screen.getByTestId('expand-content-input').querySelector('textarea')!
        expect(expandInput).toHaveValue('Some long text')
    })

    it('should save expanded content via onDataChange on confirm', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string', rows: 4 })}
                data={{ ...baseNodeData, inputValues: { myField: 'Original' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        fireEvent.click(screen.getByTitle('Expand'))

        const expandTextarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        fireEvent.change(expandTextarea, { target: { value: 'Expanded text' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: expect.objectContaining({ name: 'myField' }),
            newValue: 'Expanded text'
        })
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
                data={{ ...baseNodeData, inputValues: { myField: 'chatOpenAI' } }}
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
                data={{ ...baseNodeData, inputValues: { myField: 'chatOpenAI' } }}
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
                data={{ ...baseNodeData, inputValues: { myField: '' } }}
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
                data={{ ...baseNodeData, inputValues: { myField: 'chatOpenAI' } }}
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
                data={{ ...baseNodeData, inputValues: { myField: 'chatOpenAI' } }}
                isAdditionalParams
                onDataChange={mockOnDataChange}
                AsyncInputComponent={StubAsyncInput}
                ConfigInputComponent={StubConfigInput}
            />
        )

        expect(screen.queryByTestId('config-input-myField')).toBeNull()
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
