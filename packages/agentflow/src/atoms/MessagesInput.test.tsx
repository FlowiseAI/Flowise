import { fireEvent, render, screen, waitFor } from '@testing-library/react'

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

// Replace the TipTap-based RichTextEditor with a plain textarea so tests can
// simulate content changes via fireEvent.change without TipTap internals.
jest.mock('./RichTextEditor', () => ({
    RichTextEditor: ({
        value,
        onChange,
        disabled,
        placeholder
    }: {
        value: string
        onChange: (html: string) => void
        disabled?: boolean
        placeholder?: string
    }) => (
        <div data-testid='rich-text-editor'>
            <textarea
                data-testid='tiptap-editor-content'
                value={value}
                disabled={disabled}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    )
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
        inputs: {}
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

    it('should render existing messages with field labels, role and content', async () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
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

        // Content fields rendered as rich text editors (TipTap) — lazy-loaded
        await waitFor(() => {
            expect(screen.getAllByTestId('rich-text-editor')).toHaveLength(2)
        })
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
            inputs: {
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
            inputs: {
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
            inputs: {
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

    // --- Content field ---

    it('should render rich text editor for content field', async () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
                agentMessages: [{ role: 'system', content: 'Initial' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        expect(await screen.findByTestId('rich-text-editor')).toBeInTheDocument()
        expect(screen.getByTestId('tiptap-editor-content')).toBeInTheDocument()
    })

    // --- Content change ---

    it('should update content when RichTextEditor fires onChange', async () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
                agentMessages: [{ role: 'system', content: 'Initial' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        const textarea = await screen.findByTestId('tiptap-editor-content')
        fireEvent.change(textarea, { target: { value: 'Updated content' } })

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ role: 'system', content: 'Updated content' }]
        })
    })

    it('should support variable syntax in content via RichTextEditor', async () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
                agentMessages: [{ role: 'user', content: '' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        const textarea = await screen.findByTestId('tiptap-editor-content')
        fireEvent.change(textarea, { target: { value: '{{ question }}' } })

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ role: 'user', content: '{{ question }}' }]
        })
    })

    // --- latestContentRef: expand dialog uses fresh inline edits ---

    it('should open expand dialog with latest inline content even before parent re-renders', async () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
                agentMessages: [{ role: 'user', content: 'Original' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        // Edit inline content (parent has NOT re-rendered with new data yet)
        const textarea = await screen.findByTestId('tiptap-editor-content')
        fireEvent.change(textarea, { target: { value: 'Edited inline' } })

        // Open expand dialog
        fireEvent.click(screen.getByTitle('Expand'))

        // Wait for the lazy-loaded RichTextEditor inside the expand dialog to mount
        await waitFor(() => {
            expect(screen.getAllByTestId('tiptap-editor-content')).toHaveLength(2)
        })

        // The expand dialog should show the edited value from latestContentRef,
        // not the stale 'Original' from messages prop
        const editors = screen.getAllByTestId('tiptap-editor-content')
        const expandTextarea = editors[editors.length - 1] as HTMLTextAreaElement
        expect(expandTextarea.value).toBe('Edited inline')
    })

    it('should preserve latestContentRef entries when a preceding message is deleted', async () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
                agentMessages: [
                    { role: 'system', content: 'System prompt' },
                    { role: 'user', content: 'User message' },
                    { role: 'assistant', content: 'Assistant reply' }
                ]
            }
        } as NodeData

        const { rerender } = render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        // Edit the third message (index 2) inline
        const textareas = await screen.findAllByTestId('tiptap-editor-content')
        fireEvent.change(textareas[2], { target: { value: 'Edited assistant reply' } })

        // Delete the first message (index 0) — this should shift index 2 → 1 in latestContentRef
        const deleteButtons = screen.getAllByTitle('Delete')
        fireEvent.click(deleteButtons[0])

        // Simulate parent re-rendering with updated data (first message removed)
        const updatedData: NodeData = {
            ...mockNodeData,
            inputs: {
                agentMessages: [
                    { role: 'user', content: 'User message' },
                    { role: 'assistant', content: 'Assistant reply' }
                ]
            }
        } as NodeData
        rerender(<MessagesInput inputParam={mockInputParam} data={updatedData} onDataChange={mockOnDataChange} />)

        // Open expand for the second message (was index 2, now index 1)
        const expandButtons = screen.getAllByTitle('Expand')
        fireEvent.click(expandButtons[1])

        // The expand dialog should show the edited content from the shifted ref
        const editors = screen.getAllByTestId('tiptap-editor-content')
        const expandTextarea = editors[editors.length - 1] as HTMLTextAreaElement
        expect(expandTextarea.value).toBe('Edited assistant reply')
    })

    // --- Disabled state ---

    it('should disable all controls when disabled prop is true', async () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
                agentMessages: [{ role: 'system', content: 'Hello' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} disabled={true} onDataChange={mockOnDataChange} />)

        // Add button disabled
        expect(screen.getByRole('button', { name: /Add Messages/i })).toBeDisabled()

        // Delete button disabled
        expect(screen.getByTitle('Delete')).toBeDisabled()

        // Rich text editor is rendered (disabled state is handled by TipTap internally)
        expect(await screen.findByTestId('rich-text-editor')).toBeInTheDocument()
    })

    // --- minItems constraint ---

    it('should hide delete button when at minItems', () => {
        const inputParamWithMin: InputParam = {
            ...mockInputParam,
            minItems: 1
        }

        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
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
            inputs: {
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
            inputs: {
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
            inputs: {
                agentMessages: [{ role: 'user', content: 'Only one' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={inputParamWithMax} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        expect(screen.getByRole('button', { name: /Add Messages/i })).not.toBeDisabled()
    })

    // --- Expand dialog (now uses rich text mode with TipTap) ---

    it('should open expand dialog with rich text editor when expand icon is clicked', async () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
                agentMessages: [{ role: 'user', content: 'Hello world' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByTitle('Expand'))

        // Inline editor + expand dialog editor = 2 rich text editors
        await waitFor(() => {
            expect(screen.getAllByTestId('rich-text-editor')).toHaveLength(2)
        })
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should call onConfirm with current value when Save is clicked in expand dialog', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
                agentMessages: [{ role: 'user', content: 'Original' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByTitle('Expand'))
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        // Save fires onDataChange with the current content (unchanged since TipTap is mocked)
        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ role: 'user', content: 'Original' }]
        })
    })

    it('should close dialog without saving on cancel', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
                agentMessages: [{ role: 'user', content: 'Original' }]
            }
        } as NodeData

        render(<MessagesInput inputParam={mockInputParam} data={dataWithMessages} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByTitle('Expand'))
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(mockOnDataChange).not.toHaveBeenCalled()
    })

    // --- All four roles render as options ---

    it('should render all four role options in the dropdown', () => {
        const dataWithMessages: NodeData = {
            ...mockNodeData,
            inputs: {
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
