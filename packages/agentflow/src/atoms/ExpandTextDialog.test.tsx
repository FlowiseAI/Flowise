import { fireEvent, render, screen } from '@testing-library/react'

import { ExpandTextDialog } from './ExpandTextDialog'

// TipTap modules are auto-mocked via moduleNameMapper in jest.config.js

const mockOnConfirm = jest.fn()
const mockOnCancel = jest.fn()

beforeEach(() => {
    jest.clearAllMocks()
})

describe('ExpandTextDialog', () => {
    it('should not render content when closed', () => {
        render(<ExpandTextDialog open={false} value='' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        expect(screen.queryByTestId('expand-content-input')).not.toBeInTheDocument()
    })

    it('should render with the provided value when open', () => {
        render(<ExpandTextDialog open={true} value='Hello world' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        const textarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        expect(textarea).toHaveValue('Hello world')
    })

    it('should render title when provided', () => {
        render(<ExpandTextDialog open={true} value='' title='Content' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('should not render title when not provided', () => {
        render(<ExpandTextDialog open={true} value='' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('should call onConfirm with edited value when Save is clicked', () => {
        render(<ExpandTextDialog open={true} value='Original' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        const textarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        fireEvent.change(textarea, { target: { value: 'Updated' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        expect(mockOnConfirm).toHaveBeenCalledWith('Updated')
    })

    it('should call onCancel when Cancel is clicked', () => {
        render(<ExpandTextDialog open={true} value='Original' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(mockOnCancel).toHaveBeenCalled()
        expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should disable textarea and Save button when disabled', () => {
        render(
            <ExpandTextDialog open={true} value='test' inputType='code' disabled={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
        )

        const textarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        expect(textarea).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    it('should render placeholder when provided', () => {
        render(
            <ExpandTextDialog
                open={true}
                value=''
                inputType='code'
                placeholder='Type here...'
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        const textarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        expect(textarea).toHaveAttribute('placeholder', 'Type here...')
    })

    it('should show current value when opened after value changed while closed', () => {
        const { rerender } = render(
            <ExpandTextDialog open={false} value='' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
        )

        // Simulate value changing while dialog is closed (user typing in inline editor)
        rerender(<ExpandTextDialog open={false} value='Updated text' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        // Open the dialog — it should show the updated value, not the initial empty value
        rerender(<ExpandTextDialog open={true} value='Updated text' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        const textarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        expect(textarea).toHaveValue('Updated text')
    })

    it('should reset to current value when re-opened after cancel', () => {
        const { rerender } = render(
            <ExpandTextDialog open={true} value='Original' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
        )

        // User types in the dialog then cancels
        const textarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        fireEvent.change(textarea, { target: { value: 'Unsaved edits' } })
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        // Close the dialog
        rerender(<ExpandTextDialog open={false} value='Original' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        // Re-open — should show the original value, not the unsaved edits
        rerender(<ExpandTextDialog open={true} value='Original' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        const textarea2 = screen.getByTestId('expand-content-input').querySelector('textarea')!
        expect(textarea2).toHaveValue('Original')
    })

    // --- Rich text mode ---

    describe('inputType="string" (richtext)', () => {
        it('should render the TipTap editor instead of a TextField', async () => {
            render(
                <ExpandTextDialog open={true} value='<p>Hello</p>' inputType='string' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
            )

            // RichTextEditor renders data-testid='rich-text-editor' which wraps tiptap
            expect(await screen.findByTestId('rich-text-editor')).toBeInTheDocument()
            expect(screen.getByTestId('tiptap-editor-content')).toBeInTheDocument()

            // Plain TextField should NOT be present
            expect(screen.queryByTestId('expand-content-input')).not.toBeInTheDocument()
        })

        it('should render plain TextField for non-string input types', () => {
            render(<ExpandTextDialog open={true} value='Hello' inputType='code' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

            expect(screen.getByTestId('expand-content-input')).toBeInTheDocument()
            expect(screen.queryByTestId('rich-text-editor')).not.toBeInTheDocument()
        })

        it('should still show Save and Cancel buttons in richtext mode', () => {
            render(
                <ExpandTextDialog open={true} value='<p>Hello</p>' inputType='string' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
            )

            expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
        })

        it('should disable Save button in richtext mode when disabled', () => {
            render(
                <ExpandTextDialog
                    open={true}
                    value='<p>Hello</p>'
                    inputType='string'
                    disabled={true}
                    onConfirm={mockOnConfirm}
                    onCancel={mockOnCancel}
                />
            )

            expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
        })

        it('should render title in richtext mode', () => {
            render(
                <ExpandTextDialog
                    open={true}
                    value=''
                    title='Content'
                    inputType='string'
                    onConfirm={mockOnConfirm}
                    onCancel={mockOnCancel}
                />
            )

            expect(screen.getByText('Content')).toBeInTheDocument()
        })

        it('should call onCancel when Cancel is clicked in richtext mode', () => {
            render(
                <ExpandTextDialog open={true} value='<p>Hello</p>' inputType='string' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
            )

            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

            expect(mockOnCancel).toHaveBeenCalled()
            expect(mockOnConfirm).not.toHaveBeenCalled()
        })
    })
})
