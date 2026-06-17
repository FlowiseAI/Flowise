import React from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { createObserveTheme } from '@/core/theme'
import type { Execution, ExecutionState, NodeExecutionData } from '@/core/types'

import { ExecutionDetail } from './ExecutionDetail'

// ============================================================================
// Mocks — keep the orchestrator under test, stub the heavy children.
// useExecutionPoll is mocked so we control loading/error/data without timers.
// ============================================================================

const mockUseExecutionPoll = jest.fn()
const mockRefresh = jest.fn()

jest.mock('../hooks/useExecutionPoll', () => ({
    useExecutionPoll: (opts: unknown) => mockUseExecutionPoll(opts)
}))

jest.mock('./NodeExecutionDetail', () => ({
    NodeExecutionDetail: ({ node }: { node: { nodeLabel: string } }) => <div data-testid='node-execution-detail'>{node.nodeLabel}</div>
}))

// Atoms transitively pull in react-syntax-highlighter (ESM-only) — stub it.
jest.mock('react-syntax-highlighter', () => ({ Prism: () => null }))
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

jest.mock('@/infrastructure/store', () => ({
    useObserveConfig: () => ({ isDarkMode: false, apiBaseUrl: 'http://localhost:3000' })
}))

// ============================================================================
// Factories
// ============================================================================

function makeNode(overrides: Partial<NodeExecutionData> = {}): NodeExecutionData {
    return {
        nodeId: 'node-1',
        nodeLabel: 'Step 1',
        status: 'FINISHED',
        data: {},
        previousNodeIds: [],
        ...overrides
    }
}

function makeExecution(overrides: Partial<Execution> = {}, nodes: NodeExecutionData[] = [makeNode()]): Execution {
    return {
        id: 'exec-1',
        executionData: JSON.stringify(nodes),
        state: 'FINISHED' as ExecutionState,
        agentflowId: 'flow-1',
        sessionId: 'sess-1',
        isPublic: false,
        createdDate: '2026-01-01T00:00:00Z',
        updatedDate: '2026-01-01T00:00:00Z',
        ...overrides
    }
}

interface PollResultOverrides {
    execution?: Execution | null
    isLoading?: boolean
    error?: string | null
    refresh?: () => void
}

function setPollResult(partial: PollResultOverrides = {}) {
    mockUseExecutionPoll.mockReturnValue({
        execution: makeExecution(),
        isLoading: false,
        error: null,
        refresh: mockRefresh,
        ...partial
    })
}

function renderWithTheme(ui: React.ReactElement) {
    return render(<ThemeProvider theme={createObserveTheme(false)}>{ui}</ThemeProvider>)
}

// ============================================================================

describe('ExecutionDetail', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('async states', () => {
        it('renders a loading spinner while the execution is loading', () => {
            setPollResult({ execution: null, isLoading: true })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByRole('progressbar')).toBeInTheDocument()
        })

        it('renders the error message when the API fails', () => {
            setPollResult({ execution: null, isLoading: false, error: 'Network error' })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByText('Network error')).toBeInTheDocument()
        })

        it('renders "Execution not found" when execution is null without an explicit error', () => {
            setPollResult({ execution: null, isLoading: false })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByText('Execution not found')).toBeInTheDocument()
        })
    })

    describe('initial selection', () => {
        it('auto-selects the first top-level node on initial tree build', () => {
            const nodes = [makeNode({ nodeId: 'a', nodeLabel: 'First' }), makeNode({ nodeId: 'b', nodeLabel: 'Second' })]
            setPollResult({ execution: makeExecution({}, nodes) })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByTestId('node-execution-detail')).toHaveTextContent('First')
        })

        it('auto-selects the first STOPPED node when state is STOPPED', () => {
            const nodes = [
                makeNode({ nodeId: 'a', nodeLabel: 'Ran', status: 'FINISHED' }),
                makeNode({ nodeId: 'b', nodeLabel: 'Halted', status: 'STOPPED' }),
                makeNode({ nodeId: 'c', nodeLabel: 'NeverRan', status: 'STOPPED' })
            ]
            setPollResult({ execution: makeExecution({ state: 'STOPPED' }, nodes) })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByTestId('node-execution-detail')).toHaveTextContent('Halted')
        })

        it('falls back to the first top-level node when state is STOPPED but no node is STOPPED', () => {
            const nodes = [makeNode({ nodeId: 'a', nodeLabel: 'OnlyOne', status: 'FINISHED' })]
            setPollResult({ execution: makeExecution({ state: 'STOPPED' }, nodes) })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByTestId('node-execution-detail')).toHaveTextContent('OnlyOne')
        })

        it('shows the placeholder when the tree is empty', () => {
            setPollResult({ execution: makeExecution({ executionData: '[]' }, []) })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByText(/Select a step to view details/i)).toBeInTheDocument()
            expect(screen.queryByTestId('node-execution-detail')).not.toBeInTheDocument()
        })

        it('does not re-select when the execution re-polls', () => {
            const nodes = [makeNode({ nodeId: 'a', nodeLabel: 'First' }), makeNode({ nodeId: 'b', nodeLabel: 'Second' })]
            setPollResult({ execution: makeExecution({}, nodes) })
            const { rerender } = renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByTestId('node-execution-detail')).toHaveTextContent('First')

            // Simulate a re-poll where the execution data is replaced — the selection ref must hold.
            const nextNodes = [makeNode({ nodeId: 'x', nodeLabel: 'Different' })]
            setPollResult({ execution: makeExecution({}, nextNodes) })
            rerender(
                <ThemeProvider theme={createObserveTheme(false)}>
                    <ExecutionDetail executionId='exec-1' />
                </ThemeProvider>
            )

            expect(screen.getByTestId('node-execution-detail')).toHaveTextContent('First')
        })
    })

    describe('sidebar header', () => {
        it('renders the agentflow name as a clickable chip with the external-link icon when onAgentflowClick is provided', async () => {
            setPollResult({
                execution: makeExecution({ agentflow: { id: 'flow-1', name: 'My Flow' } })
            })
            const onAgentflowClick = jest.fn()
            renderWithTheme(<ExecutionDetail executionId='exec-1' onAgentflowClick={onAgentflowClick} />)

            const chip = screen.getByRole('button', { name: 'My Flow' })
            // Visual distinction: clickable variant carries the IconExternalLink affordance.
            expect(chip.querySelector('.tabler-icon-external-link')).not.toBeNull()

            await userEvent.click(chip)
            expect(onAgentflowClick).toHaveBeenCalledWith('flow-1')
        })

        it('renders the agentflow name as a non-clickable, icon-less chip when onAgentflowClick is absent', () => {
            setPollResult({
                execution: makeExecution({ agentflow: { id: 'flow-1', name: 'My Flow' } })
            })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            // Label still shows…
            expect(screen.getByText('My Flow')).toBeInTheDocument()
            // …but the chip is not a button (no role) and carries no external-link affordance.
            expect(screen.queryByRole('button', { name: 'My Flow' })).not.toBeInTheDocument()
            expect(document.querySelector('.tabler-icon-external-link')).toBeNull()
        })

        it('renders a non-clickable "Go to AgentFlow" fallback chip when neither agentflow info nor onAgentflowClick is provided', () => {
            // PARITY: legacy renders the chip unconditionally (gated only on `!isPublic`).
            // Mirroring that, the non-clickable variant always renders with the trailing label fallback.
            setPollResult({ execution: makeExecution({ agentflow: undefined }) })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByText(/Go to AgentFlow/i)).toBeInTheDocument()
            // Still non-clickable — no role=button on the fallback chip.
            expect(screen.queryByRole('button', { name: /Go to AgentFlow/i })).not.toBeInTheDocument()
        })

        it('falls back to "Go to AgentFlow" when onAgentflowClick is provided but the execution has no agentflow info', () => {
            // PARITY: legacy renders the chip whenever a navigation target exists, falling back to "Go to AgentFlow" when no name/id is available on the execution.
            setPollResult({ execution: makeExecution({ agentflow: undefined }) })
            const onAgentflowClick = jest.fn()
            renderWithTheme(<ExecutionDetail executionId='exec-1' onAgentflowClick={onAgentflowClick} />)

            const chip = screen.getByRole('button', { name: /Go to AgentFlow/i })
            expect(chip).toBeInTheDocument()
        })

        it('falls back to the `agentflow` prop when the detail endpoint does not return the join', () => {
            // The server's getExecutionById doesn't perform the agentflow join — only
            // getAllExecutions does. ExecutionsViewer threads the row's agentflow
            // info into ExecutionDetail via this prop so the chip can render the real name.
            setPollResult({ execution: makeExecution({ agentflow: undefined }) })
            const onAgentflowClick = jest.fn()
            renderWithTheme(
                <ExecutionDetail
                    executionId='exec-1'
                    onAgentflowClick={onAgentflowClick}
                    agentflow={{ id: 'flow-99', name: 'Seeded Flow' }}
                />
            )
            expect(screen.getByRole('button', { name: 'Seeded Flow' })).toBeInTheDocument()
        })

        it('prefers execution.agentflow from the API over the `agentflow` prop fallback', () => {
            // Once the server adds the join, the API response wins.
            setPollResult({ execution: makeExecution({ agentflow: { id: 'flow-real', name: 'From API' } }) })
            const onAgentflowClick = jest.fn()
            renderWithTheme(
                <ExecutionDetail
                    executionId='exec-1'
                    onAgentflowClick={onAgentflowClick}
                    agentflow={{ id: 'flow-stale', name: 'Stale Prop' }}
                />
            )
            expect(screen.getByRole('button', { name: 'From API' })).toBeInTheDocument()
            expect(screen.queryByText('Stale Prop')).not.toBeInTheDocument()
        })

        it('falls back to agentflow.id when name is missing', () => {
            setPollResult({ execution: makeExecution({ agentflow: { id: 'flow-1', name: '' as unknown as string } }) })
            const onAgentflowClick = jest.fn()
            renderWithTheme(<ExecutionDetail executionId='exec-1' onAgentflowClick={onAgentflowClick} />)
            expect(screen.getByText('flow-1')).toBeInTheDocument()
        })

        it('calls refresh when the refresh button is clicked', async () => {
            setPollResult({})
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
            expect(mockRefresh).toHaveBeenCalledTimes(1)
        })

        it('writes the execution id to the clipboard when the Copy ID chip is clicked', async () => {
            const writeText = jest.fn().mockResolvedValue(undefined)
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
            setPollResult({})

            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            await userEvent.click(screen.getByText('Copy ID'))
            expect(writeText).toHaveBeenCalledWith('exec-1')
        })

        it('flips the Copy ID label to "Copied!" after click', async () => {
            const writeText = jest.fn().mockResolvedValue(undefined)
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
            setPollResult({})

            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByText('Copy ID')).toBeInTheDocument()
            await userEvent.click(screen.getByText('Copy ID'))
            // Scoped to the chip's role; `userEvent.click` opens the Tooltip
            // popper (role='tooltip', also "Copied!"), so a plain `getByText`
            // would match both elements.
            expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
        })

        it('logs a warning and leaves the chip on "Copy ID" when the clipboard write rejects', async () => {
            const writeText = jest.fn().mockRejectedValue(new Error('denied'))
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
            const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})
            setPollResult({})

            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            await userEvent.click(screen.getByText('Copy ID'))

            // Wait a microtask for the rejected promise to flush.
            await act(async () => {})
            expect(consoleWarn).toHaveBeenCalledWith('[Observe] Clipboard copy failed:', expect.any(Error))
            // The chip must NOT flash "Copied!" when the write fails.
            expect(screen.queryByRole('button', { name: 'Copied!' })).not.toBeInTheDocument()
            expect(screen.getByText('Copy ID')).toBeInTheDocument()
            consoleWarn.mockRestore()
        })

        it('does nothing when navigator.clipboard is undefined', async () => {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
            setPollResult({})

            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            // Should not throw.
            await userEvent.click(screen.getByText('Copy ID'))
        })

        it('renders the formatted updated date', () => {
            setPollResult({
                execution: makeExecution({ updatedDate: '2026-04-29T15:30:00Z' })
            })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            // Format: 'MMM d, yyyy h:mm a'. Time-zone-dependent — assert the date prefix and an h:mm a clock-time substring.
            const datePrefix = screen.getByText(/Apr 29, 2026/i)
            expect(datePrefix).toBeInTheDocument()
            expect(datePrefix.textContent).toMatch(/\d{1,2}:\d{2} (AM|PM)/)
        })

        it('renders "N/A" when the execution has no updated date', () => {
            setPollResult({ execution: makeExecution({ updatedDate: undefined as unknown as string }) })
            renderWithTheme(<ExecutionDetail executionId='exec-1' />)
            expect(screen.getByText('N/A')).toBeInTheDocument()
        })
    })
})
