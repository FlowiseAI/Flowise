import { fireEvent, render, screen } from '@testing-library/react'

import { SwitchInput } from './SwitchInput'

const mockOnChange = jest.fn()

beforeEach(() => {
    jest.clearAllMocks()
})

describe('SwitchInput', () => {
    it('renders switch element', () => {
        render(<SwitchInput value={false} onChange={mockOnChange} />)

        expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('shows label when provided', () => {
        render(<SwitchInput label='Enable feature' value={false} onChange={mockOnChange} />)

        expect(screen.getByText('Enable feature')).toBeInTheDocument()
    })

    it('does not show label when not provided', () => {
        const { container } = render(<SwitchInput value={false} onChange={mockOnChange} />)

        expect(container.querySelector('.MuiTypography-root')).not.toBeInTheDocument()
    })

    it('switch is checked when value is true', () => {
        render(<SwitchInput value={true} onChange={mockOnChange} />)

        expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('switch is unchecked when value is false', () => {
        render(<SwitchInput value={false} onChange={mockOnChange} />)

        expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    it('calls onChange when toggled', () => {
        render(<SwitchInput value={false} onChange={mockOnChange} />)

        fireEvent.click(screen.getByRole('checkbox'))

        expect(mockOnChange).toHaveBeenCalledWith(true)
    })

    it('switch is disabled when disabled prop is true', () => {
        render(<SwitchInput value={false} onChange={mockOnChange} disabled={true} />)

        expect(screen.getByRole('checkbox')).toBeDisabled()
    })

    it('handles string value coercion (truthy string → true)', () => {
        render(<SwitchInput value='hello' onChange={mockOnChange} />)

        expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('handles undefined value (defaults to false)', () => {
        render(<SwitchInput value={undefined} onChange={mockOnChange} />)

        expect(screen.getByRole('checkbox')).not.toBeChecked()
    })
})
