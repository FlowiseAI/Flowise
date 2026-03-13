import { fireEvent, render, screen } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { MessagesInput } from './MessagesInput'

// --- Mocks ---
const mockOnDataChange = jest.fn()

jest.mock('@tabler/icons-react', () => ({
    IconArrowsMaximize: () => <span data-testid='icon-expand' />,
    IconPlus: () => <span data-testid='icon-plus' />,
    IconTrash: () => <span data-testid='icon-trash' />,
    IconVariable: () => <span data-testid='icon-variable' />
}))

describe('MessagesInput', () => {
    const mockInputParam: InputParam = {
        id: 'messages',
        name: 'agentMessages',
        label: 'Messages',
        type: 'array'
    }

    const mockNodeData: NodeData = {
        id: 'node-1',
        name: 'agentAgentflow',
        label: 'Agent',
        inputValues: {}
    } as NodeData

    beforeEach(() => {
        jest.clearAllMocks()
    })

    // --- Rendering ---

    it('should render section header and empty state with only Add button', () => {
        render(<MessagesInput inputParam={mockInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        // Section header from inputParam.label
        expect(screen.getByText('Messages')).toBeInTheDocument()
        expect(screen.queryByText('0')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Add Messages/i })).toBeInTheDocument()
    })

    it('should render existing messages with field labels, role and content', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [
                    { role: 'system', content: 'You are a helpful assistant' },
                    { role: 'user', content: '{{ question }}' }
                ]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        // Index chips
        expect(screen.getByText('0')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()

        // Field labels (2 messages × 2 labels each)
        expect(screen.getAllByText('Role')).toHaveLength(2)
        expect(screen.getAllByText('Content')).toHaveLength(2)

        // Variable and expand icons on content fields
        expect(screen.getAllByTestId('icon-variable')).toHaveLength(2)
        expect(screen.getAllByTestId('icon-expand')).toHaveLength(2)

        // Role dropdowns show current values
        const roleSelects = screen.getAllByRole('combobox')
        expect(roleSelects).toHaveLength(2)

        // Content textareas
        const textareas = screen.getAllByRole('textbox')
        expect(textareas).toHaveLength(2)
        expect(textareas[0]).toHaveValue('You are a helpful assistant')
        expect(textareas[1]).toHaveValue('{{ question }}')
    })

    // --- Add ---

    it('should add a new message with default role "user" and empty content', () => {
        render(<MessagesInput inputParam={mockInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Add Messages/i }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ role: 'user', content: '' }]
        })
    })

    it('should append to existing messages when adding', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'system', content: 'Hello' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Add Messages/i }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [
                { role: 'system', content: 'Hello' },
                { role: 'user', content: '' }
            ]
        })
    })

    // --- Delete ---

    it('should delete a message and call onDataChange with updated array', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [
                    { role: 'system', content: 'System message' },
                    { role: 'user', content: 'User message' }
                ]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        const deleteButtons = screen.getAllByTitle('Delete')
        fireEvent.click(deleteButtons[0])

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ role: 'user', content: 'User message' }]
        })
    })

    // --- Role change ---

    it('should update role when dropdown changes', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'user', content: 'Hello' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        // MUI Select renders a hidden input; trigger change via the combobox
        const roleSelect = screen.getByRole('combobox')
        // Open dropdown and select 'system'
        fireEvent.mouseDown(roleSelect)
        const systemOption = screen.getByText('System')
        fireEvent.click(systemOption)

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ role: 'system', content: 'Hello' }]
        })
    })

    // --- Content change ---

    it('should update content when textarea changes', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'system', content: 'Initial' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        const textarea = screen.getByRole('textbox')
        fireEvent.change(textarea, { target: { value: 'Updated content' } })

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ role: 'system', content: 'Updated content' }]
        })
    })

    it('should support variable syntax in content', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'user', content: '' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        const textarea = screen.getByRole('textbox')
        fireEvent.change(textarea, { target: { value: '{{ question }}' } })

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ role: 'user', content: '{{ question }}' }]
        })
    })

    // --- Disabled state ---

    it('should disable all controls when disabled prop is true', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'system', content: 'Hello' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} disabled={true} onDataChange={mockOnDataChange} />)

        // Add button disabled
        expect(screen.getByRole('button', { name: /Add Messages/i })).toBeDisabled()

        // Delete button disabled
        expect(screen.getByTitle('Delete')).toBeDisabled()

        // Textarea disabled
        expect(screen.getByRole('textbox')).toBeDisabled()
    })

    // --- minItems constraint ---

    it('should hide delete button when at minItems', () => {
        const inputParamWithMin: InputParam = {
            ...mockInputParam,
            minItems: 1
        }

        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'user', content: 'Only message' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={inputParamWithMin} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        expect(screen.queryByTitle('Delete')).not.toBeInTheDocument()
    })

    it('should allow delete when above minItems', () => {
        const inputParamWithMin: InputParam = {
            ...mockInputParam,
            minItems: 1
        }

        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [
                    { role: 'system', content: 'First' },
                    { role: 'user', content: 'Second' }
                ]
            }
        } as NodeData

        render(<MessagesInput inputParam={inputParamWithMin} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        const deleteButtons = screen.getAllByTitle('Delete')
        expect(deleteButtons[0]).not.toBeDisabled()
        expect(deleteButtons[1]).not.toBeDisabled()
    })

    // --- maxItems constraint ---

    it('should disable Add button when at maxItems', () => {
        const inputParamWithMax: InputParam = {
            ...mockInputParam,
            maxItems: 2
        }

        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [
                    { role: 'system', content: 'First' },
                    { role: 'user', content: 'Second' }
                ]
            }
        } as NodeData

        render(<MessagesInput inputParam={inputParamWithMax} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        expect(screen.getByRole('button', { name: /Add Messages/i })).toBeDisabled()
    })

    it('should enable Add button when below maxItems', () => {
        const inputParamWithMax: InputParam = {
            ...mockInputParam,
            maxItems: 3
        }

        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'user', content: 'Only one' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={inputParamWithMax} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        expect(screen.getByRole('button', { name: /Add Messages/i })).not.toBeDisabled()
    })

    // --- Expand dialog ---

    it('should open expand dialog with current content when expand icon is clicked', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'user', content: 'Hello world' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByTitle('Expand'))

        const expandInput = screen.getByTestId('expand-content-input').querySelector('textarea')!
        expect(expandInput).toHaveValue('Hello world')
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should save expanded content and close dialog on confirm', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'user', content: 'Original' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByTitle('Expand'))

        const expandTextarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        fireEvent.change(expandTextarea, { target: { value: 'Expanded content' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ role: 'user', content: 'Expanded content' }]
        })
    })

    it('should close dialog without saving on cancel', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'user', content: 'Original' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByTitle('Expand'))

        const expandTextarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        fireEvent.change(expandTextarea, { target: { value: 'Discarded' } })
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(mockOnDataChange).not.toHaveBeenCalled()
    })

    // --- All four roles render as options ---

    it('should render all four role options in the dropdown', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputValues: {
                agentMessages: [{ role: 'user', content: '' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        // Open the dropdown
        fireEvent.mouseDown(screen.getByRole('combobox'))

        // All four roles should appear as options in the listbox
        const options = screen.getAllByRole('option')
        const optionValues = options.map((opt) => opt.getAttribute('data-value'))
        expect(optionValues).toEqual(['system', 'assistant', 'developer', 'user'])
    })
})
