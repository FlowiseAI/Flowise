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
        render(<ExpandTextDialog open={false} value='' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        expect(screen.queryByTestId('expand-content-input')).not.toBeInTheDocument()
    })

    it('should render with the provided value when open', () => {
        render(<ExpandTextDialog open={true} value='Hello world' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        const textarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        expect(textarea).toHaveValue('Hello world')
    })

    it('should render title when provided', () => {
        render(<ExpandTextDialog open={true} value='' title='Content' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('should not render title when not provided', () => {
        render(<ExpandTextDialog open={true} value='' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('should call onConfirm with edited value when Save is clicked', () => {
        render(<ExpandTextDialog open={true} value='Original' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        const textarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        fireEvent.change(textarea, { target: { value: 'Updated' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        expect(mockOnConfirm).toHaveBeenCalledWith('Updated')
    })

    it('should call onCancel when Cancel is clicked', () => {
        render(<ExpandTextDialog open={true} value='Original' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(mockOnCancel).toHaveBeenCalled()
        expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should disable textarea and Save button when disabled', () => {
        render(<ExpandTextDialog open={true} value='test' disabled={true} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        const textarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        expect(textarea).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    it('should render placeholder when provided', () => {
        render(<ExpandTextDialog open={true} value='' placeholder='Type here...' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

        const textarea = screen.getByTestId('expand-content-input').querySelector('textarea')!
        expect(textarea).toHaveAttribute('placeholder', 'Type here...')
    })

    // --- Rich text mode ---

    describe('mode="richtext"', () => {
        it('should render the TipTap editor instead of a TextField', async () => {
            render(<ExpandTextDialog open={true} value='<p>Hello</p>' mode='richtext' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

            // RichTextEditor renders data-testid='rich-text-editor' which wraps tiptap
            expect(await screen.findByTestId('rich-text-editor')).toBeInTheDocument()
            expect(screen.getByTestId('tiptap-editor-content')).toBeInTheDocument()

            // Plain TextField should NOT be present
            expect(screen.queryByTestId('expand-content-input')).not.toBeInTheDocument()
        })

        it('should render plain TextField in default text mode', () => {
            render(<ExpandTextDialog open={true} value='Hello' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

            expect(screen.getByTestId('expand-content-input')).toBeInTheDocument()
            expect(screen.queryByTestId('rich-text-editor')).not.toBeInTheDocument()
        })

        it('should still show Save and Cancel buttons in richtext mode', () => {
            render(<ExpandTextDialog open={true} value='<p>Hello</p>' mode='richtext' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

            expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
        })

        it('should disable Save button in richtext mode when disabled', () => {
            render(
                <ExpandTextDialog
                    open={true}
                    value='<p>Hello</p>'
                    mode='richtext'
                    disabled={true}
                    onConfirm={mockOnConfirm}
                    onCancel={mockOnCancel}
                />
            )

            expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
        })

        it('should render title in richtext mode', () => {
            render(
                <ExpandTextDialog open={true} value='' title='Content' mode='richtext' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
            )

            expect(screen.getByText('Content')).toBeInTheDocument()
        })

        it('should call onCancel when Cancel is clicked in richtext mode', () => {
            render(<ExpandTextDialog open={true} value='<p>Hello</p>' mode='richtext' onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

            expect(mockOnCancel).toHaveBeenCalled()
            expect(mockOnConfirm).not.toHaveBeenCalled()
        })
    })
})
