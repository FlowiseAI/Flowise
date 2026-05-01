import type { ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'
import type { ExecutionTreeNode } from '@/core/types'

import { ExecutionTreeSidebar } from './ExecutionTreeSidebar'

// Stub the syntax highlighter pulled in transitively via @/atoms
// (CodeFenceBlock → react-syntax-highlighter, ESM-only).
jest.mock('react-syntax-highlighter', () => ({ Prism: () => null }))
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

jest.mock('@/infrastructure/store', () => ({
    useObserveConfig: () => ({ isDarkMode: false, apiBaseUrl: 'http://localhost:3000' })
}))

function renderWithTheme(ui: ReactElement) {
    return render(<ThemeProvider theme={createObserveTheme(false)}>{ui}</ThemeProvider>)
}

function makeNode(overrides: Partial<ExecutionTreeNode> = {}): ExecutionTreeNode {
    return {
        id: overrides.id ?? overrides.nodeId ?? 'node-1',
        nodeId: overrides.nodeId ?? 'node-1',
        nodeLabel: 'Step 1',
        status: 'FINISHED',
        name: 'startAgentflow',
        children: [],
        ...overrides
    }
}

describe('ExecutionTreeSidebar', () => {
    describe('empty state', () => {
        it('renders the empty placeholder when tree is []', () => {
            renderWithTheme(<ExecutionTreeSidebar tree={[]} selectedId={null} onSelect={jest.fn()} />)
            expect(screen.getByText(/No execution steps recorded/i)).toBeInTheDocument()
        })
    })

    describe('rendering', () => {
        it('renders one row per top-level node with its label', () => {
            const tree = [
                makeNode({ id: 'a', nodeId: 'a', nodeLabel: 'Start' }),
                makeNode({ id: 'b', nodeId: 'b', nodeLabel: 'Agent', name: 'agentAgentflow' })
            ]
            renderWithTheme(<ExecutionTreeSidebar tree={tree} selectedId={null} onSelect={jest.fn()} />)
            expect(screen.getByText('Start')).toBeInTheDocument()
            expect(screen.getByText('Agent')).toBeInTheDocument()
        })

        it('recursively renders child rows under their parent', () => {
            const tree = [
                makeNode({
                    id: 'parent',
                    nodeId: 'parent',
                    nodeLabel: 'Loop',
                    name: 'loopAgentflow',
                    children: [makeNode({ id: 'child', nodeId: 'child', nodeLabel: 'Inner Step' })]
                })
            ]
            renderWithTheme(<ExecutionTreeSidebar tree={tree} selectedId={null} onSelect={jest.fn()} />)
            expect(screen.getByText('Loop')).toBeInTheDocument()
            expect(screen.getByText('Inner Step')).toBeInTheDocument()
        })

        it('renders virtual iteration container nodes as italic captions instead of clickable rows', () => {
            const tree: ExecutionTreeNode[] = [
                {
                    id: 'iter-0',
                    nodeId: 'iter-0',
                    nodeLabel: 'Iteration #1',
                    status: 'FINISHED',
                    isVirtualNode: true,
                    name: '',
                    children: []
                }
            ]
            renderWithTheme(<ExecutionTreeSidebar tree={tree} selectedId={null} onSelect={jest.fn()} />)
            const label = screen.getByText('Iteration #1')
            expect(label).toBeInTheDocument()
            // Virtual labels render as a Typography caption with italic style;
            // not wrapped in the clickable Box's role-pointer cursor.
            expect(label.tagName.toLowerCase()).toBe('span')
        })
    })

    describe('selection', () => {
        it('fires onSelect with the clicked node (skipping virtual nodes)', () => {
            const onSelect = jest.fn()
            const tree = [
                makeNode({ id: 'real', nodeId: 'real', nodeLabel: 'Real' }),
                {
                    id: 'iter-0',
                    nodeId: 'iter-0',
                    nodeLabel: 'Iteration #1',
                    status: 'FINISHED' as const,
                    isVirtualNode: true,
                    name: '',
                    children: []
                }
            ]
            renderWithTheme(<ExecutionTreeSidebar tree={tree} selectedId={null} onSelect={onSelect} />)

            fireEvent.click(screen.getByText('Real'))
            expect(onSelect).toHaveBeenCalledTimes(1)
            expect(onSelect.mock.calls[0][0].nodeId).toBe('real')

            // Clicking the virtual row must NOT call onSelect.
            fireEvent.click(screen.getByText('Iteration #1'))
            expect(onSelect).toHaveBeenCalledTimes(1)
        })

        it('still calls onSelect on a row even when it matches selectedId (idempotent re-click)', () => {
            // Sanity: passing selectedId doesn't disable the row's click target.
            // (MUI's `sx` background highlight isn't observable from jsdom's
            // computed style, so we anchor on the click behavior here.)
            const onSelect = jest.fn()
            const tree = [makeNode({ id: 'a', nodeId: 'a', nodeLabel: 'First' })]
            renderWithTheme(<ExecutionTreeSidebar tree={tree} selectedId='a' onSelect={onSelect} />)
            fireEvent.click(screen.getByText('First'))
            expect(onSelect).toHaveBeenCalledTimes(1)
            expect(onSelect.mock.calls[0][0].nodeId).toBe('a')
        })
    })

    describe('expand/collapse', () => {
        it('renders children expanded by default', () => {
            const tree = [
                makeNode({
                    id: 'parent',
                    nodeId: 'parent',
                    nodeLabel: 'Parent',
                    children: [makeNode({ id: 'child', nodeId: 'child', nodeLabel: 'Child' })]
                })
            ]
            renderWithTheme(<ExecutionTreeSidebar tree={tree} selectedId={null} onSelect={jest.fn()} />)
            expect(screen.getByText('Child')).toBeInTheDocument()
        })

        it('toggles children visibility when a parent row with children is clicked', () => {
            const onSelect = jest.fn()
            const tree = [
                makeNode({
                    id: 'parent',
                    nodeId: 'parent',
                    nodeLabel: 'Parent',
                    children: [makeNode({ id: 'child', nodeId: 'child', nodeLabel: 'Child' })]
                })
            ]
            renderWithTheme(<ExecutionTreeSidebar tree={tree} selectedId={null} onSelect={onSelect} />)
            expect(screen.getByText('Child')).toBeInTheDocument()

            fireEvent.click(screen.getByText('Parent'))
            expect(screen.queryByText('Child')).not.toBeInTheDocument()

            fireEvent.click(screen.getByText('Parent'))
            expect(screen.getByText('Child')).toBeInTheDocument()
        })
    })
})
