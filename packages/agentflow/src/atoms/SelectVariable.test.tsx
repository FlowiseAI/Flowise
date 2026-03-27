import { fireEvent, render, screen } from '@testing-library/react'

import type { VariableItem } from './SelectVariable'
import { SelectVariable } from './SelectVariable'

jest.mock('@tabler/icons-react', () => ({
    IconBinaryTree: () => <span data-testid='icon-tree' />,
    IconHistory: () => <span data-testid='icon-history' />,
    IconMessageChatbot: () => <span data-testid='icon-message' />,
    IconPaperclip: () => <span data-testid='icon-paperclip' />
}))

const mockItems: VariableItem[] = [
    { label: 'question', description: "User's question", category: 'Chat Context', value: '{{question}}' },
    { label: 'chat_history', description: 'Past history', category: 'Chat Context', value: '{{chat_history}}' },
    { label: 'Start', description: 'Output from Start', category: 'Node Outputs', value: '{{start_0.data.instance}}' }
]

describe('SelectVariable', () => {
    it('renders the title', () => {
        render(<SelectVariable items={mockItems} onSelect={jest.fn()} />)

        expect(screen.getByText('Select Variable')).toBeInTheDocument()
    })

    it('renders all items', () => {
        render(<SelectVariable items={mockItems} onSelect={jest.fn()} />)

        expect(screen.getByText('question')).toBeInTheDocument()
        expect(screen.getByText('chat_history')).toBeInTheDocument()
        expect(screen.getByText('Start')).toBeInTheDocument()
    })

    it('renders descriptions', () => {
        render(<SelectVariable items={mockItems} onSelect={jest.fn()} />)

        expect(screen.getByText("User's question")).toBeInTheDocument()
        expect(screen.getByText('Output from Start')).toBeInTheDocument()
    })

    it('calls onSelect with the item value when clicked', () => {
        const onSelect = jest.fn()
        render(<SelectVariable items={mockItems} onSelect={onSelect} />)

        fireEvent.click(screen.getByText('question'))

        expect(onSelect).toHaveBeenCalledWith('{{question}}')
    })

    it('returns null when disabled', () => {
        const { container } = render(<SelectVariable items={mockItems} onSelect={jest.fn()} disabled />)

        expect(container.firstChild).toBeNull()
    })

    it('returns null when items is empty', () => {
        const { container } = render(<SelectVariable items={[]} onSelect={jest.fn()} />)

        expect(container.firstChild).toBeNull()
    })

    it('renders items as a flat list without category headers', () => {
        render(<SelectVariable items={mockItems} onSelect={jest.fn()} />)

        // Should NOT have category headers like "CHAT CONTEXT" or "NODE OUTPUTS"
        expect(screen.queryByText('Chat Context')).not.toBeInTheDocument()
        expect(screen.queryByText('Node Outputs')).not.toBeInTheDocument()
    })
})
