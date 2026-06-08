import { type ReactElement, useState } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AGENTFLOW_ICONS } from '@/core/primitives'
import { createObserveTheme } from '@/core/theme'
import type { ExecutionTreeNode } from '@/core/types'

import { ExecutionTreeSidebar } from './ExecutionTreeSidebar'

// Stub the syntax highlighter pulled in transitively via @/atoms.
jest.mock('react-syntax-highlighter', () => ({ Prism: () => null }))
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

jest.mock('@/infrastructure/store', () => ({
    useObserveConfig: () => ({ isDarkMode: false, apiBaseUrl: 'http://localhost:3000' })
}))

function renderWithTheme(ui: ReactElement) {
    return render(<ThemeProvider theme={createObserveTheme(false)}>{ui}</ThemeProvider>)
}

function collectAllIds(nodes: ExecutionTreeNode[]): string[] {
    const ids: string[] = []
    for (const node of nodes) {
        ids.push(node.id)
        if (node.children.length > 0) ids.push(...collectAllIds(node.children))
    }
    return ids
}

interface HarnessProps {
    tree: ExecutionTreeNode[]
    onSelect?: (node: ExecutionTreeNode) => void
    initialExpanded?: string[]
}

/**
 * Wrapper that owns the controlled selectedId/expandedIds state, mirroring
 * the contract `ExecutionDetail` provides in production. Tests assert against
 * what reaches the DOM through this contract.
 */
function Harness({ tree, onSelect, initialExpanded }: HarnessProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [expandedIds, setExpandedIds] = useState<string[]>(initialExpanded ?? collectAllIds(tree))
    return (
        <ExecutionTreeSidebar
            tree={tree}
            selectedId={selectedId}
            onSelect={(node) => {
                setSelectedId(node.id)
                onSelect?.(node)
            }}
            expandedIds={expandedIds}
            onExpandedChange={setExpandedIds}
        />
    )
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
            renderWithTheme(<Harness tree={[]} />)
            expect(screen.getByText(/No execution steps recorded/i)).toBeInTheDocument()
        })
    })

    describe('rendering', () => {
        it('renders one row per top-level node with its label', () => {
            const tree = [
                makeNode({ id: 'a', nodeId: 'a', nodeLabel: 'Start' }),
                makeNode({ id: 'b', nodeId: 'b', nodeLabel: 'Agent', name: 'agentAgentflow' })
            ]
            renderWithTheme(<Harness tree={tree} />)
            expect(screen.getByText('Start')).toBeInTheDocument()
            expect(screen.getByText('Agent')).toBeInTheDocument()
        })

        it('recursively renders child rows when the parent is expanded', () => {
            const tree = [
                makeNode({
                    id: 'parent',
                    nodeId: 'parent',
                    nodeLabel: 'Loop',
                    name: 'loopAgentflow',
                    children: [makeNode({ id: 'child', nodeId: 'child', nodeLabel: 'Inner Step' })]
                })
            ]
            renderWithTheme(<Harness tree={tree} />)
            expect(screen.getByText('Loop')).toBeInTheDocument()
            expect(screen.getByText('Inner Step')).toBeInTheDocument()
        })

        it('renders the iteration icon for virtual iteration container nodes', () => {
            const tree: ExecutionTreeNode[] = [
                {
                    id: 'iter-0',
                    nodeId: 'iter-0',
                    nodeLabel: 'Iteration #0',
                    status: 'FINISHED',
                    isVirtualNode: true,
                    name: 'iterationAgentflow',
                    children: []
                }
            ]
            renderWithTheme(<Harness tree={tree} />)
            // Iteration row shows its label …
            expect(screen.getByText('Iteration #0')).toBeInTheDocument()
            // … and the AGENTFLOW_ICONS lookup renders the iteration icon
            // (`IconRelationOneToManyFilled`). The DOM only locks the icon
            // identity; the registry assertion below locks its color.
            const treeitem = screen.getByRole('treeitem')
            expect(treeitem.querySelector('.tabler-icon-relation-one-to-many-filled')).not.toBeNull()
            expect(AGENTFLOW_ICONS.iterationAgentflow.icon).toBeDefined()
            expect(AGENTFLOW_ICONS.iterationAgentflow.color).toMatch(/^#[0-9a-fA-F]{6}$/)
        })

        it.each([
            ['FINISHED', 'CheckCircleIcon'],
            ['ERROR', 'ErrorIcon'],
            ['TIMEOUT', 'ErrorIcon'],
            ['STOPPED', 'StopCircleIcon']
        ] as const)('renders the %s status icon as MUI %s', (state, testId) => {
            const tree = [makeNode({ id: 'a', nodeId: 'a', status: state })]
            renderWithTheme(<Harness tree={tree} />)
            expect(screen.getByTestId(testId)).toBeInTheDocument()
        })

        it('renders TERMINATED with the tabler IconCircleXFilled (no MUI icon test-id)', () => {
            const tree = [makeNode({ id: 'a', nodeId: 'a', status: 'TERMINATED' })]
            renderWithTheme(<Harness tree={tree} />)
            // Tabler icons don't expose data-testid; assert via class.
            expect(document.querySelector('.tabler-icon-circle-x-filled')).not.toBeNull()
            // No MUI status icon should be rendered for TERMINATED.
            expect(screen.queryByTestId('CheckCircleIcon')).not.toBeInTheDocument()
        })

        it('renders INPROGRESS with the tabler IconLoader spin animation', () => {
            const tree = [makeNode({ id: 'a', nodeId: 'a', status: 'INPROGRESS' })]
            renderWithTheme(<Harness tree={tree} />)
            expect(document.querySelector('.tabler-icon-loader')).not.toBeNull()
        })

        it('renders the rolled-up status icon on virtual iteration rows (legacy parity)', () => {
            const tree: ExecutionTreeNode[] = [
                {
                    id: 'iter-0',
                    nodeId: 'iter-0',
                    nodeLabel: 'Iteration #0',
                    status: 'FINISHED',
                    isVirtualNode: true,
                    name: 'iterationAgentflow',
                    children: []
                }
            ]
            renderWithTheme(<Harness tree={tree} />)
            expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument()
        })

        it('omits the status icon when virtual iteration status is UNKNOWN', () => {
            const tree: ExecutionTreeNode[] = [
                {
                    id: 'iter-0',
                    nodeId: 'iter-0',
                    nodeLabel: 'Iteration #0',
                    status: 'UNKNOWN',
                    isVirtualNode: true,
                    name: 'iterationAgentflow',
                    children: []
                }
            ]
            renderWithTheme(<Harness tree={tree} />)
            expect(screen.queryByTestId('CheckCircleIcon')).not.toBeInTheDocument()
            expect(screen.queryByTestId('ErrorIcon')).not.toBeInTheDocument()
            expect(screen.queryByTestId('StopCircleIcon')).not.toBeInTheDocument()
        })
    })

    describe('selection', () => {
        it('fires onSelect for real and virtual nodes — legacy parity', async () => {
            const onSelect = jest.fn()
            const tree = [
                makeNode({ id: 'real', nodeId: 'real', nodeLabel: 'Real' }),
                {
                    id: 'iter-0',
                    nodeId: 'iter-0',
                    nodeLabel: 'Iteration #0',
                    status: 'FINISHED' as const,
                    isVirtualNode: true,
                    name: 'iterationAgentflow',
                    children: []
                }
            ]
            renderWithTheme(<Harness tree={tree} onSelect={onSelect} />)

            await userEvent.click(screen.getByText('Real'))
            expect(onSelect).toHaveBeenCalledTimes(1)
            expect(onSelect.mock.calls[0][0].nodeId).toBe('real')

            await userEvent.click(screen.getByText('Iteration #0'))
            expect(onSelect).toHaveBeenCalledTimes(2)
            expect(onSelect.mock.calls[1][0].nodeId).toBe('iter-0')
        })
    })

    describe('expand/collapse', () => {
        it('renders children when initialExpanded includes the parent id', () => {
            const tree = [
                makeNode({
                    id: 'parent',
                    nodeId: 'parent',
                    nodeLabel: 'Parent',
                    children: [makeNode({ id: 'child', nodeId: 'child', nodeLabel: 'Child' })]
                })
            ]
            renderWithTheme(<Harness tree={tree} initialExpanded={['parent']} />)
            expect(screen.getByText('Child')).toBeInTheDocument()
        })

        it('omits children when initialExpanded is empty', () => {
            const tree = [
                makeNode({
                    id: 'parent',
                    nodeId: 'parent',
                    nodeLabel: 'Parent',
                    children: [makeNode({ id: 'child', nodeId: 'child', nodeLabel: 'Child' })]
                })
            ]
            renderWithTheme(<Harness tree={tree} initialExpanded={[]} />)
            expect(screen.queryByText('Child')).not.toBeInTheDocument()
        })
    })
})
