import { createRef, type Ref } from 'react'

import { createTheme, ThemeProvider } from '@mui/material/styles'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { SuggestionDropdown, type SuggestionDropdownRef, type SuggestionItem } from './SuggestionDropdown'

const theme = createTheme()

const ITEMS: SuggestionItem[] = [
    { id: 'question', label: 'question', description: "User's question", category: 'Chat Context' },
    { id: 'chat_history', label: 'chat_history', description: 'Conversation history', category: 'Chat Context' },
    { id: 'node1.data.instance', label: 'LLM Node', description: 'Output from LLM', category: 'Node Outputs' },
    { id: '$flow.state.count', label: '$flow.state.count', description: 'State variable', category: 'Flow State' }
]

function renderDropdown(props: Partial<React.ComponentProps<typeof SuggestionDropdown>> = {}, ref?: Ref<SuggestionDropdownRef>) {
    const defaultProps = {
        items: ITEMS,
        command: jest.fn(),
        ...props
    }

    const result = render(
        <ThemeProvider theme={theme}>
            <SuggestionDropdown ref={ref} {...defaultProps} />
        </ThemeProvider>
    )

    return { ...result, ...defaultProps }
}

describe('SuggestionDropdown', () => {
    it('renders grouped items by category', () => {
        renderDropdown()

        expect(screen.getByText('Chat Context')).toBeInTheDocument()
        expect(screen.getByText('Node Outputs')).toBeInTheDocument()
        expect(screen.getByText('Flow State')).toBeInTheDocument()
        expect(screen.getByText('question')).toBeInTheDocument()
        expect(screen.getByText('LLM Node')).toBeInTheDocument()
    })

    it('renders nothing when items array is empty', () => {
        renderDropdown({ items: [] })

        expect(screen.queryByTestId('suggestion-dropdown')).not.toBeInTheDocument()
    })

    it('calls command with correct attrs when item is clicked', () => {
        const { command } = renderDropdown()

        fireEvent.click(screen.getByText('question'))

        expect(command).toHaveBeenCalledWith({ id: 'question', label: 'question' })
    })

    it('shows descriptions for items', () => {
        renderDropdown()

        expect(screen.getByText("User's question")).toBeInTheDocument()
        expect(screen.getByText('Output from LLM')).toBeInTheDocument()
    })

    it('exposes onKeyDown via ref for Enter selection', () => {
        const ref = createRef<SuggestionDropdownRef>()
        const { command } = renderDropdown({}, ref)

        // Enter selects first item (index 0)
        const handled = ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) })

        expect(handled).toBe(true)
        expect(command).toHaveBeenCalledWith({ id: 'question', label: 'question' })
    })

    it('exposes onKeyDown via ref for ArrowDown navigation', () => {
        const ref = createRef<SuggestionDropdownRef>()
        const { command } = renderDropdown({}, ref)

        // ArrowDown moves to index 1 — wrap in act() so React flushes state
        act(() => {
            ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) })
        })
        // Enter selects index 1
        act(() => {
            ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) })
        })

        expect(command).toHaveBeenCalledWith({ id: 'chat_history', label: 'chat_history' })
    })

    it('exposes onKeyDown via ref for ArrowUp navigation (wraps around)', () => {
        const ref = createRef<SuggestionDropdownRef>()
        const { command } = renderDropdown({}, ref)

        // ArrowUp from index 0 wraps to last — wrap in act() so React flushes state
        act(() => {
            ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowUp' }) })
        })
        act(() => {
            ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) })
        })

        expect(command).toHaveBeenCalledWith({ id: '$flow.state.count', label: '$flow.state.count' })
    })

    it('returns false for unhandled keys', () => {
        const ref = createRef<SuggestionDropdownRef>()
        renderDropdown({}, ref)

        const handled = ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'a' }) })
        expect(handled).toBe(false)
    })
})
