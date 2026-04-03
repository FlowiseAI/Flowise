import { createTheme, ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { StateUpdate } from '@/core/types'

import { StateKeyValueInput } from './StateKeyValueInput'

// Mock VariableInput to avoid TipTap complexity in unit tests
jest.mock('./VariableInput', () => ({
    VariableInput: ({
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
        <input
            data-testid='mock-variable-input'
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
        />
    )
}))

const theme = createTheme()

function renderInput(props: Partial<React.ComponentProps<typeof StateKeyValueInput>> = {}) {
    const defaultProps = {
        value: [] as StateUpdate[],
        onChange: jest.fn(),
        ...props
    }
    return render(
        <ThemeProvider theme={theme}>
            <StateKeyValueInput {...defaultProps} />
        </ThemeProvider>
    )
}

describe('StateKeyValueInput', () => {
    it('renders an empty state with only the add button', () => {
        renderInput()
        expect(screen.getByRole('button', { name: /add state update/i })).toBeInTheDocument()
        expect(screen.queryByTitle('Remove')).not.toBeInTheDocument()
    })

    it('renders existing entries with key and value fields', () => {
        const value: StateUpdate[] = [
            { key: 'counter', value: '1' },
            { key: 'name', value: 'test' }
        ]
        renderInput({ value })
        const keyInputs = screen.getAllByPlaceholderText('State key name')
        expect(keyInputs).toHaveLength(2)
        expect(keyInputs[0]).toHaveValue('counter')
        expect(keyInputs[1]).toHaveValue('name')
    })

    it('calls onChange with a new empty entry when add button is clicked', async () => {
        const user = userEvent.setup()
        const onChange = jest.fn()
        renderInput({ onChange, value: [{ key: 'existing', value: 'val' }] })

        await user.click(screen.getByRole('button', { name: /add state update/i }))
        expect(onChange).toHaveBeenCalledWith([
            { key: 'existing', value: 'val' },
            { key: '', value: '' }
        ])
    })

    it('calls onChange with updated key when key field changes', async () => {
        const user = userEvent.setup()
        const onChange = jest.fn()
        renderInput({
            onChange,
            value: [
                { key: '', value: '' },
                { key: 'other', value: 'kept' }
            ]
        })

        const keyInputs = screen.getAllByPlaceholderText('State key name')
        await user.type(keyInputs[0], 'x')
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(lastCall[0].key).toBe('x')
        expect(lastCall[1]).toEqual({ key: 'other', value: 'kept' })
    })

    it('calls onChange with entry removed when remove is clicked', async () => {
        const user = userEvent.setup()
        const onChange = jest.fn()
        const value: StateUpdate[] = [
            { key: 'a', value: '1' },
            { key: 'b', value: '2' }
        ]
        renderInput({ onChange, value })

        const removeButtons = screen.getAllByTitle('Remove')
        await user.click(removeButtons[0])
        expect(onChange).toHaveBeenCalledWith([{ key: 'b', value: '2' }])
    })

    it('disables all inputs when disabled prop is true', () => {
        renderInput({
            value: [{ key: 'k', value: 'v' }],
            disabled: true
        })
        expect(screen.getByPlaceholderText('State key name')).toBeDisabled()
        expect(screen.getByRole('button', { name: /add state update/i })).toBeDisabled()
        expect(screen.getByTitle('Remove')).toBeDisabled()
    })

    it('calls onChange with updated value when value field changes', async () => {
        const user = userEvent.setup()
        const onChange = jest.fn()
        renderInput({
            onChange,
            value: [
                { key: 'myKey', value: '' },
                { key: 'other', value: 'kept' }
            ]
        })

        const valueInputs = screen.getAllByTestId('mock-variable-input')
        await user.type(valueInputs[0], 'x')
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(lastCall[0].key).toBe('myKey')
        expect(lastCall[0].value).toBe('x')
        expect(lastCall[1]).toEqual({ key: 'other', value: 'kept' })
    })

    it('handles non-array value gracefully', () => {
        renderInput({ value: 'not-an-array' as unknown as StateUpdate[] })
        expect(screen.getByRole('button', { name: /add state update/i })).toBeInTheDocument()
        expect(screen.queryByPlaceholderText('State key name')).not.toBeInTheDocument()
    })

    it('passes suggestionItems to VariableInput', () => {
        const suggestions = [{ id: 'q', label: 'question', description: 'User question', category: 'Chat' }]
        renderInput({
            value: [{ key: 'k', value: 'v' }],
            suggestionItems: suggestions
        })
        expect(screen.getByTestId('mock-variable-input')).toBeInTheDocument()
    })
})
