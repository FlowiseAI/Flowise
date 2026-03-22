import { fireEvent, render, screen } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { EditNodeDialog } from './EditNodeDialog'

// --- Mocks ---
const mockUpdateNodeData = jest.fn()
const mockUpdateNodeInternals = jest.fn()

jest.mock('reactflow', () => ({
    ...jest.requireActual('reactflow'),
    useUpdateNodeInternals: () => mockUpdateNodeInternals
}))

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: {},
        updateNodeData: mockUpdateNodeData
    }),
    useConfigContext: () => ({
        isDarkMode: false
    })
}))

jest.mock('@/atoms', () => ({
    NodeInputHandler: ({
        inputParam,
        onDataChange
    }: {
        inputParam: InputParam
        data: NodeData
        onDataChange: (args: { inputParam: InputParam; newValue: unknown }) => void
    }) => (
        <div data-testid={`input-handler-${inputParam.name}`}>
            <button data-testid={`change-${inputParam.name}`} onClick={() => onDataChange({ inputParam, newValue: 'test-value' })}>
                Change {inputParam.name}
            </button>
        </div>
    )
}))

jest.mock('@tabler/icons-react', () => ({
    IconCheck: () => <span data-testid='icon-check' />,
    IconInfoCircle: () => <span data-testid='icon-info' />,
    IconPencil: () => <span data-testid='icon-pencil' />,
    IconX: () => <span data-testid='icon-x' />
}))

describe('EditNodeDialog', () => {
    const nodeData: NodeData = {
        id: 'node-1',
        name: 'llmAgentflow',
        label: 'My LLM Node',
        inputValues: { model: 'gpt-4' }
    } as NodeData

    const inputParams: InputParam[] = [
        { name: 'model', label: 'Model', type: 'string' } as InputParam,
        { name: 'temperature', label: 'Temperature', type: 'number' } as InputParam,
        { name: 'hiddenParam', label: 'Hidden', type: 'string', display: false } as InputParam
    ]

    const defaultProps = {
        show: true,
        dialogProps: {
            inputParams,
            data: nodeData,
            disabled: false
        },
        onCancel: jest.fn()
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return null when show is false', () => {
        const { container } = render(<EditNodeDialog {...defaultProps} show={false} />)
        expect(container.innerHTML).toBe('')
    })

    it('should render dialog when show is true', () => {
        render(<EditNodeDialog {...defaultProps} />)
        expect(screen.getByText('My LLM Node')).toBeInTheDocument()
    })

    it('should display the edit pencil button when data has id', () => {
        render(<EditNodeDialog {...defaultProps} />)
        expect(screen.getByTitle('Edit Name')).toBeInTheDocument()
    })

    it('should toggle to editing mode when pencil is clicked', () => {
        render(<EditNodeDialog {...defaultProps} />)
        // Click the icon inside the Avatar (event bubbles to Avatar's onClick)
        fireEvent.click(screen.getByTestId('icon-pencil'))
        expect(screen.getByTitle('Save Name')).toBeInTheDocument()
        expect(screen.getByTitle('Cancel')).toBeInTheDocument()
    })

    it('should save name on Enter key and call updateNodeData', () => {
        render(<EditNodeDialog {...defaultProps} />)

        // Enter editing mode
        fireEvent.click(screen.getByTestId('icon-pencil'))

        // Find the text field and press Enter
        const textField = screen.getByDisplayValue('My LLM Node')
        fireEvent.keyDown(textField, { key: 'Enter' })

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { label: expect.any(String) })
        expect(mockUpdateNodeInternals).toHaveBeenCalledWith('node-1')
        // Should exit editing mode
        expect(screen.queryByTitle('Save Name')).not.toBeInTheDocument()
    })

    it('should cancel editing on Escape key without saving', () => {
        render(<EditNodeDialog {...defaultProps} />)

        fireEvent.click(screen.getByTestId('icon-pencil'))
        const textField = screen.getByDisplayValue('My LLM Node')
        fireEvent.keyDown(textField, { key: 'Escape' })

        expect(mockUpdateNodeData).not.toHaveBeenCalled()
        expect(screen.queryByTitle('Save Name')).not.toBeInTheDocument()
    })

    it('should cancel editing on Cancel button click', () => {
        render(<EditNodeDialog {...defaultProps} />)

        fireEvent.click(screen.getByTestId('icon-pencil'))
        // Click the X icon inside the Cancel Avatar
        fireEvent.click(screen.getByTestId('icon-x'))

        expect(mockUpdateNodeData).not.toHaveBeenCalled()
        expect(screen.queryByTitle('Save Name')).not.toBeInTheDocument()
    })

    it('should save name on Save button click', () => {
        render(<EditNodeDialog {...defaultProps} />)

        fireEvent.click(screen.getByTestId('icon-pencil'))
        // Click the check icon inside the Save Avatar
        fireEvent.click(screen.getByTestId('icon-check'))

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { label: expect.any(String) })
        expect(mockUpdateNodeInternals).toHaveBeenCalledWith('node-1')
    })

    it('should render hint section when data.hint exists', () => {
        const propsWithHint = {
            ...defaultProps,
            dialogProps: {
                ...defaultProps.dialogProps,
                data: { ...nodeData, hint: 'This is a helpful hint' }
            }
        }
        render(<EditNodeDialog {...propsWithHint} />)
        expect(screen.getByText('This is a helpful hint')).toBeInTheDocument()
    })

    it('should not render hint section when data.hint is absent', () => {
        render(<EditNodeDialog {...defaultProps} />)
        expect(screen.queryByTestId('icon-info')).not.toBeInTheDocument()
    })

    it('should filter out input params with display === false', () => {
        render(<EditNodeDialog {...defaultProps} />)

        expect(screen.getByTestId('input-handler-model')).toBeInTheDocument()
        expect(screen.getByTestId('input-handler-temperature')).toBeInTheDocument()
        expect(screen.queryByTestId('input-handler-hiddenParam')).not.toBeInTheDocument()
    })

    it('should call updateNodeData when onCustomDataChange fires', () => {
        render(<EditNodeDialog {...defaultProps} />)

        fireEvent.click(screen.getByTestId('change-model'))

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
            inputValues: { model: 'test-value' }
        })
    })

    it('should merge new input values with existing ones', () => {
        render(<EditNodeDialog {...defaultProps} />)

        fireEvent.click(screen.getByTestId('change-temperature'))

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
            inputValues: expect.objectContaining({
                model: 'gpt-4',
                temperature: 'test-value'
            })
        })
    })
})
