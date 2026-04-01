import { createTheme, ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { VariableItem } from './VariablePicker'
import { VariablePicker } from './VariablePicker'

const theme = createTheme()

function renderPicker(props: Partial<React.ComponentProps<typeof VariablePicker>> = {}) {
    const defaultProps = {
        items: [] as VariableItem[],
        onSelect: jest.fn(),
        ...props
    }
    return render(
        <ThemeProvider theme={theme}>
            <VariablePicker {...defaultProps} />
        </ThemeProvider>
    )
}

const VARIABLES: VariableItem[] = [
    { label: 'question', description: "User's question from chatbox", category: 'Chat Context', value: '{{question}}' },
    { label: 'chat_history', description: 'Past conversation history', category: 'Chat Context', value: '{{chat_history}}' },
    { label: 'nodeA', description: 'Output from Node A', category: 'Node Outputs', value: '{{nodeA.data.instance}}' },
    { label: '$flow.state.count', description: 'Counter state', category: 'Flow State', value: '$flow.state.count' }
]

describe('VariablePicker', () => {
    it('renders null when disabled', () => {
        const { container } = renderPicker({ items: VARIABLES, disabled: true })
        expect(container.innerHTML).toBe('')
    })

    it('renders null when items array is empty', () => {
        const { container } = renderPicker({ items: [] })
        expect(container.innerHTML).toBe('')
    })

    it('renders the "Select Variable" heading', () => {
        renderPicker({ items: VARIABLES })
        expect(screen.getByText('Select Variable')).toBeInTheDocument()
    })

    it('renders category headers', () => {
        renderPicker({ items: VARIABLES })
        expect(screen.getByText('Chat Context')).toBeInTheDocument()
        expect(screen.getByText('Node Outputs')).toBeInTheDocument()
        expect(screen.getByText('Flow State')).toBeInTheDocument()
    })

    it('renders variable labels and descriptions', () => {
        renderPicker({ items: VARIABLES })
        expect(screen.getByText('question')).toBeInTheDocument()
        expect(screen.getByText("User's question from chatbox")).toBeInTheDocument()
        expect(screen.getByText('chat_history')).toBeInTheDocument()
        expect(screen.getByText('nodeA')).toBeInTheDocument()
        expect(screen.getByText('$flow.state.count')).toBeInTheDocument()
    })

    it('groups items by category', () => {
        renderPicker({ items: VARIABLES })
        // Chat Context should contain both question and chat_history
        const listItems = screen.getAllByRole('button')
        expect(listItems).toHaveLength(4)
    })

    it('calls onSelect with the variable value when item is clicked', async () => {
        const user = userEvent.setup()
        const onSelect = jest.fn()
        renderPicker({ items: VARIABLES, onSelect })

        await user.click(screen.getByText('question'))
        expect(onSelect).toHaveBeenCalledWith('{{question}}')
    })

    it('calls onSelect with the correct value for each item', async () => {
        const user = userEvent.setup()
        const onSelect = jest.fn()
        renderPicker({ items: VARIABLES, onSelect })

        await user.click(screen.getByText('$flow.state.count'))
        expect(onSelect).toHaveBeenCalledWith('$flow.state.count')
    })

    it('uses "Other" category for items without a category', () => {
        const items: VariableItem[] = [{ label: 'custom', description: 'A custom var', value: '{{custom}}' }]
        renderPicker({ items })
        expect(screen.getByText('Other')).toBeInTheDocument()
        expect(screen.getByText('custom')).toBeInTheDocument()
    })
})
