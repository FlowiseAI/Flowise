import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { NodeToolbarActions } from './NodeToolbarActions'

// --- Mocks ---

jest.mock('reactflow', () => ({
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' }
}))

// Expose align/isVisible as data attributes so tests can assert them
jest.mock('../styled', () => ({
    StyledNodeToolbar: ({ align, isVisible, children }: { align: string; isVisible?: boolean; children: React.ReactNode }) => (
        <div data-testid='node-toolbar' data-align={align} data-visible={String(isVisible ?? 'undefined')}>
            {children}
        </div>
    )
}))

const mockDeleteNode = jest.fn()
const mockDuplicateNode = jest.fn()
const mockOpenNodeEditor = jest.fn()

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        deleteNode: mockDeleteNode,
        duplicateNode: mockDuplicateNode
    }),
    useConfigContext: () => ({ isDarkMode: false })
}))

jest.mock('../hooks', () => ({
    useOpenNodeEditor: () => ({ openNodeEditor: mockOpenNodeEditor })
}))

jest.mock('@mui/material/styles', () => ({
    useTheme: () => ({
        palette: {
            primary: { main: '#1976d2' },
            error: { main: '#d32f2f' },
            info: { main: '#0288d1' }
        }
    })
}))

jest.mock('@mui/material', () => ({
    ButtonGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    IconButton: ({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) => (
        <button data-testid={`btn-${title?.toLowerCase()}`} title={title} onClick={onClick}>
            {children}
        </button>
    )
}))

jest.mock('@tabler/icons-react', () => ({
    IconCopy: () => <svg />,
    IconEdit: () => <svg />,
    IconInfoCircle: () => <svg />,
    IconTrash: () => <svg />
}))

// --- Helpers ---

function renderToolbar(overrides: Partial<React.ComponentProps<typeof NodeToolbarActions>> = {}) {
    return render(<NodeToolbarActions nodeId='node-1' nodeName='llmAgentflow' isVisible={false} {...overrides} />)
}

// --- Tests ---

describe('NodeToolbarActions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('toolbar alignment', () => {
        it('centers the toolbar above the node to match v2 layout', () => {
            renderToolbar()
            expect(screen.getByTestId('node-toolbar')).toHaveAttribute('data-align', 'center')
        })
    })

    describe('toolbar visibility', () => {
        it('passes isVisible as undefined (ReactFlow default) when isVisible prop is false', () => {
            renderToolbar({ isVisible: false })
            expect(screen.getByTestId('node-toolbar')).toHaveAttribute('data-visible', 'undefined')
        })

        it('passes isVisible as true when forced visible', () => {
            renderToolbar({ isVisible: true })
            expect(screen.getByTestId('node-toolbar')).toHaveAttribute('data-visible', 'true')
        })
    })

    describe('button visibility by node type', () => {
        it('renders Duplicate, Edit, and Delete for standard nodes', () => {
            renderToolbar({ nodeName: 'llmAgentflow' })
            expect(screen.getByTitle('Duplicate')).toBeInTheDocument()
            expect(screen.getByTitle('Edit')).toBeInTheDocument()
            expect(screen.getByTitle('Delete')).toBeInTheDocument()
        })

        it('hides Duplicate for startAgentflow', () => {
            renderToolbar({ nodeName: 'startAgentflow' })
            expect(screen.queryByTitle('Duplicate')).not.toBeInTheDocument()
            expect(screen.getByTitle('Edit')).toBeInTheDocument()
            expect(screen.getByTitle('Delete')).toBeInTheDocument()
        })

        it('hides Edit for stickyNoteAgentflow', () => {
            renderToolbar({ nodeName: 'stickyNoteAgentflow' })
            expect(screen.queryByTitle('Edit')).not.toBeInTheDocument()
            expect(screen.getByTitle('Duplicate')).toBeInTheDocument()
            expect(screen.getByTitle('Delete')).toBeInTheDocument()
        })

        it('renders Info button when onInfoClick is provided', () => {
            renderToolbar({ onInfoClick: jest.fn() })
            expect(screen.getByTitle('Info')).toBeInTheDocument()
        })

        it('omits Info button when onInfoClick is not provided', () => {
            renderToolbar()
            expect(screen.queryByTitle('Info')).not.toBeInTheDocument()
        })
    })

    describe('button interactions', () => {
        it('calls duplicateNode when Duplicate is clicked', async () => {
            const user = userEvent.setup()
            renderToolbar({ nodeName: 'llmAgentflow' })
            await user.click(screen.getByTitle('Duplicate'))
            expect(mockDuplicateNode).toHaveBeenCalledWith('node-1')
        })

        it('calls deleteNode when Delete is clicked', async () => {
            const user = userEvent.setup()
            renderToolbar()
            await user.click(screen.getByTitle('Delete'))
            expect(mockDeleteNode).toHaveBeenCalledWith('node-1')
        })

        it('calls openNodeEditor when Edit is clicked', async () => {
            const user = userEvent.setup()
            renderToolbar()
            await user.click(screen.getByTitle('Edit'))
            expect(mockOpenNodeEditor).toHaveBeenCalledWith('node-1')
        })

        it('calls onInfoClick when Info is clicked', async () => {
            const user = userEvent.setup()
            const onInfoClick = jest.fn()
            renderToolbar({ onInfoClick })
            await user.click(screen.getByTitle('Info'))
            expect(onInfoClick).toHaveBeenCalled()
        })
    })
})
