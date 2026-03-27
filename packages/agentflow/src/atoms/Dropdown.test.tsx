import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Dropdown, DropdownOption } from './Dropdown'

const mockOnSelect = jest.fn()

const options: DropdownOption[] = [
    { label: 'GPT-4o', name: 'gpt-4o' },
    { label: 'Claude 3', name: 'claude-3' },
    { label: 'Gemini', name: 'gemini', description: 'Google model', imageSrc: 'http://test/gemini.png' }
]

beforeEach(() => {
    jest.clearAllMocks()
})

describe('Dropdown', () => {
    it('renders without crashing', () => {
        render(<Dropdown value='' options={options} onSelect={mockOnSelect} />)

        expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('displays options when opened', async () => {
        render(<Dropdown value='' options={options} onSelect={mockOnSelect} />)

        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => {
            expect(screen.getByText('GPT-4o')).toBeInTheDocument()
            expect(screen.getByText('Claude 3')).toBeInTheDocument()
            expect(screen.getByText('Gemini')).toBeInTheDocument()
        })
    })

    it('calls onSelect with option name when option is clicked', async () => {
        render(<Dropdown value='' options={options} onSelect={mockOnSelect} />)

        const input = screen.getByRole('combobox')
        fireEvent.change(input, { target: { value: 'GPT' } })
        await waitFor(() => screen.getByText('GPT-4o'))
        fireEvent.click(screen.getByText('GPT-4o'))

        expect(mockOnSelect).toHaveBeenCalledWith('gpt-4o')
    })

    it('shows image in option when imageSrc is present', async () => {
        render(<Dropdown value='' options={options} onSelect={mockOnSelect} />)

        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => {
            const img = screen.getByAltText('Gemini')
            expect(img).toBeInTheDocument()
            expect(img).toHaveAttribute('src', 'http://test/gemini.png')
        })
    })

    it('shows description in option when present', async () => {
        render(<Dropdown value='' options={options} onSelect={mockOnSelect} />)

        fireEvent.mouseDown(screen.getByRole('combobox'))
        await waitFor(() => {
            expect(screen.getByText('Google model')).toBeInTheDocument()
        })
    })

    it('renders in disabled state', () => {
        render(<Dropdown value='' options={options} onSelect={mockOnSelect} disabled />)

        expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('shows selected value label', () => {
        render(<Dropdown value='gpt-4o' options={options} onSelect={mockOnSelect} />)

        expect(screen.getByRole('combobox')).toHaveValue('GPT-4o')
    })
})
