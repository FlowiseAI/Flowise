import React from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'
import type { ExecutionTreeNode, NodeExecutionData } from '@/core/types'

import { NodeExecutionDetail } from './NodeExecutionDetail'

// ============================================================================
// Mocks — focused on what the orchestrator wires up. Unit-level behaviors
// (curated values, HITL state machine, content rendering, JsonBlock palette,
// metrics formatting, conditions) live in their own test files.
// ============================================================================

jest.mock('flowise-react-json-view', () => {
    const ReactJsonStub = ({ src }: { src: unknown }) => <pre data-testid='react-json-view'>{JSON.stringify(src)}</pre>
    return { __esModule: true, default: ReactJsonStub }
})

jest.mock('react-markdown', () => {
    const ReactMarkdownStub = ({ children }: { children?: React.ReactNode }) => <div data-testid='react-markdown'>{children}</div>
    return { __esModule: true, default: ReactMarkdownStub }
})
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => null }))

jest.mock('react-syntax-highlighter', () => ({
    Prism: ({ children }: { children?: React.ReactNode }) => <pre data-testid='syntax-highlighter'>{children}</pre>
}))
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

jest.mock('@/infrastructure/store', () => ({
    useObserveConfig: () => ({ isDarkMode: false, apiBaseUrl: 'http://localhost:3000' })
}))

// ============================================================================
// Factories
// ============================================================================

function makeNodeData(overrides: Partial<NodeExecutionData> = {}): NodeExecutionData {
    return {
        nodeId: 'node-1',
        nodeLabel: 'Step 1',
        status: 'FINISHED',
        data: {},
        previousNodeIds: [],
        ...overrides
    }
}

function makeTreeNode(overrides: Partial<ExecutionTreeNode> = {}, raw?: NodeExecutionData): ExecutionTreeNode {
    const rawData = raw ?? makeNodeData(overrides as Partial<NodeExecutionData>)
    return {
        id: rawData.nodeId,
        nodeId: rawData.nodeId,
        nodeLabel: rawData.nodeLabel,
        status: rawData.status,
        name: rawData.name ?? '',
        children: [],
        raw: rawData,
        ...overrides
    }
}

function renderWithTheme(ui: React.ReactElement) {
    return render(<ThemeProvider theme={createObserveTheme(false)}>{ui}</ThemeProvider>)
}

const baseProps = {
    agentflowId: 'flow-1',
    sessionId: 'sess-1'
}

// ============================================================================
// Integration smoke — orchestration only
// ============================================================================

describe('NodeExecutionDetail (integration smoke)', () => {
    describe('header', () => {
        it('renders the node label', () => {
            const node = makeTreeNode({ nodeLabel: 'My Node' }, makeNodeData({ nodeLabel: 'My Node' }))
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} />)
            expect(screen.getByText('My Node')).toBeInTheDocument()
        })

        it('does not surface the raw node type name in the header (icon already conveys type)', () => {
            const node = makeTreeNode(undefined, makeNodeData({ name: 'agentAgentflow', nodeLabel: 'Agent A' }))
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} />)
            expect(screen.queryByText('agentAgentflow')).not.toBeInTheDocument()
        })
    })

    describe('rendered/raw toggle', () => {
        it('defaults to rendered view (Input + Output sections present, no full payload dump)', () => {
            const data = { input: 'hello world', output: 'goodbye' }
            const node = makeTreeNode(undefined, makeNodeData({ data }))
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} />)
            expect(screen.getByText('Input')).toBeInTheDocument()
            expect(screen.getByText('Output')).toBeInTheDocument()
            expect(screen.queryByText(JSON.stringify(data))).not.toBeInTheDocument()
        })

        it('switches to raw view when the raw toggle is clicked, dumping the full payload', () => {
            const data = { input: 'hello', output: 'world' }
            const node = makeTreeNode(undefined, makeNodeData({ data }))
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} />)
            fireEvent.click(screen.getByRole('button', { name: 'Raw' }))
            const dump = screen.getAllByTestId('react-json-view').find((el) => el.textContent === JSON.stringify(data))
            expect(dump).toBeDefined()
        })

        it('null-guards the toggle when the user deselects the active button', () => {
            const node = makeTreeNode(undefined, makeNodeData({ data: { input: 'hi' } }))
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} />)
            expect(screen.getByText('Input')).toBeInTheDocument()
            // MUI emits null when clicking the active button — no crash, no swap.
            fireEvent.click(screen.getByRole('button', { name: 'Rendered' }))
            expect(screen.getByText('Input')).toBeInTheDocument()
        })
    })

    describe('section wiring', () => {
        it('renders Error section only when data.error is truthy', () => {
            const without = makeTreeNode(undefined, makeNodeData({ data: { output: 'ok' } }))
            const { unmount } = renderWithTheme(<NodeExecutionDetail node={without} {...baseProps} />)
            expect(screen.queryByText('Error')).not.toBeInTheDocument()
            unmount()

            const withError = makeTreeNode(undefined, makeNodeData({ data: { error: 'Boom' } }))
            renderWithTheme(<NodeExecutionDetail node={withError} {...baseProps} />)
            expect(screen.getByText('Error')).toBeInTheDocument()
            expect(screen.getByText('Boom')).toBeInTheDocument()
        })

        it('renders State section only when data.state is a non-empty object', () => {
            const empty = makeTreeNode(undefined, makeNodeData({ data: { state: {} } }))
            const { unmount } = renderWithTheme(<NodeExecutionDetail node={empty} {...baseProps} />)
            expect(screen.queryByText('State')).not.toBeInTheDocument()
            unmount()

            const withState = makeTreeNode(undefined, makeNodeData({ data: { state: { count: 3 } } }))
            renderWithTheme(<NodeExecutionDetail node={withState} {...baseProps} />)
            expect(screen.getByText('State')).toBeInTheDocument()
        })

        it('routes chat-style messages through ChatMessageBubble (role chips above content)', () => {
            const node = makeTreeNode(
                undefined,
                makeNodeData({
                    data: {
                        input: {
                            messages: [
                                { role: 'system', content: 'You are a helpful assistant.' },
                                { role: 'user', content: 'Summarize the PR' }
                            ]
                        }
                    }
                })
            )
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} />)
            expect(screen.getByText('system')).toBeInTheDocument()
            expect(screen.getByText('user')).toBeInTheDocument()
            expect(screen.getByText('You are a helpful assistant.')).toBeInTheDocument()
            expect(screen.getByText('Summarize the PR')).toBeInTheDocument()
        })

        it('routes a condition node output through FulfilledConditionsBlock', () => {
            const node = makeTreeNode(
                undefined,
                makeNodeData({
                    data: {
                        output: {
                            conditions: [{ type: 'string', operation: 'equal', value1: 'a', value2: 'a', isFulfilled: true }]
                        }
                    }
                })
            )
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} />)
            expect(screen.getByText('Condition 0')).toBeInTheDocument()
            expect(screen.getByText('Fulfilled')).toBeInTheDocument()
        })

        it('renders a Tools section above Input when data.output.availableTools is present', () => {
            const node = makeTreeNode(
                undefined,
                makeNodeData({
                    data: {
                        output: {
                            availableTools: [
                                { name: 'search_repositories', toolNode: { name: 'githubMcp', label: 'Github MCP' } },
                                { name: 'get_issue' }
                            ],
                            usedTools: [{ tool: 'search_repositories' }]
                        }
                    }
                })
            )
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} />)
            expect(screen.getByText('Tools')).toBeInTheDocument()
            expect(screen.getByText('Github MCP')).toBeInTheDocument()
            expect(screen.getByText('get_issue')).toBeInTheDocument()
            expect(screen.getByText('Used')).toBeInTheDocument()
        })

        it('omits the Tools section when availableTools is missing or empty', () => {
            const empty = makeTreeNode(undefined, makeNodeData({ data: { output: { availableTools: [] } } }))
            const { unmount } = renderWithTheme(<NodeExecutionDetail node={empty} {...baseProps} />)
            expect(screen.queryByText('Tools')).not.toBeInTheDocument()
            unmount()

            const missing = makeTreeNode(undefined, makeNodeData({ data: { output: { content: 'ok' } } }))
            renderWithTheme(<NodeExecutionDetail node={missing} {...baseProps} />)
            expect(screen.queryByText('Tools')).not.toBeInTheDocument()
        })

        it('renders usedTools chips inside the Output section when present', () => {
            const node = makeTreeNode(
                undefined,
                makeNodeData({
                    data: {
                        output: {
                            content: 'The repo does X',
                            usedTools: [{ tool: 'search_repositories' }, { tool: 'get_file_contents' }]
                        }
                    }
                })
            )
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} />)
            expect(screen.getByText('search_repositories')).toBeInTheDocument()
            expect(screen.getByText('get_file_contents')).toBeInTheDocument()
        })

        it('renders the metrics row when output carries time/token/cost metadata', () => {
            const node = makeTreeNode(
                undefined,
                makeNodeData({
                    data: { output: { timeMetadata: { delta: 2500 }, usageMetadata: { total_tokens: 99, total_cost: 0.25 } } }
                })
            )
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} />)
            const group = screen.getByRole('group', { name: /metrics/i })
            expect(within(group).getByText('2.50 seconds')).toBeInTheDocument()
            expect(within(group).getByText('99 tokens')).toBeInTheDocument()
            expect(within(group).getByText('$0.25')).toBeInTheDocument()
        })
    })

    describe('HITL gating', () => {
        const hitlNode = (overrides: Partial<NodeExecutionData> = {}) =>
            makeTreeNode(
                { status: 'INPROGRESS' },
                makeNodeData({
                    name: 'humanInputAgentflow',
                    status: 'INPROGRESS',
                    data: { question: 'Approve this?' },
                    ...overrides
                })
            )

        it('hides the action bar when no onHumanInput callback is provided', () => {
            renderWithTheme(<NodeExecutionDetail node={hitlNode()} {...baseProps} />)
            expect(screen.queryByTestId('hitl-action-bar')).not.toBeInTheDocument()
        })

        it('hides the action bar when the node name is not humanInputAgentflow', () => {
            const onHumanInput = jest.fn()
            const node = makeTreeNode(
                { status: 'INPROGRESS' },
                makeNodeData({ name: 'llmAgentflow', status: 'INPROGRESS', data: { question: 'q' } })
            )
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} onHumanInput={onHumanInput} />)
            expect(screen.queryByTestId('hitl-action-bar')).not.toBeInTheDocument()
        })

        it('hides the action bar when the node is not INPROGRESS', () => {
            const onHumanInput = jest.fn()
            const node = makeTreeNode(
                { status: 'FINISHED' },
                makeNodeData({ name: 'humanInputAgentflow', status: 'FINISHED', data: { question: 'q' } })
            )
            renderWithTheme(<NodeExecutionDetail node={node} {...baseProps} onHumanInput={onHumanInput} />)
            expect(screen.queryByTestId('hitl-action-bar')).not.toBeInTheDocument()
        })

        it('shows the floating action bar with Proceed + Reject buttons when all conditions are met', () => {
            const onHumanInput = jest.fn().mockResolvedValue(undefined)
            renderWithTheme(<NodeExecutionDetail node={hitlNode()} {...baseProps} onHumanInput={onHumanInput} />)
            const bar = screen.getByTestId('hitl-action-bar')
            expect(within(bar).getByRole('button', { name: 'Proceed' })).toBeInTheDocument()
            expect(within(bar).getByRole('button', { name: 'Reject' })).toBeInTheDocument()
        })
    })

    describe('virtual nodes', () => {
        const virtualNode = (overrides: Partial<ExecutionTreeNode> = {}): ExecutionTreeNode => ({
            id: 'iter-0',
            nodeId: 'loop',
            nodeLabel: 'Iteration #1',
            status: 'FINISHED',
            name: '',
            children: [],
            isVirtualNode: true,
            ...overrides
        })

        it('does not crash when raw is undefined (renders the label and "No data")', () => {
            renderWithTheme(<NodeExecutionDetail node={virtualNode()} {...baseProps} />)
            expect(screen.getByText('Iteration #1')).toBeInTheDocument()
            expect(screen.getAllByText('No data').length).toBeGreaterThanOrEqual(1)
        })

        it('does not show HITL controls even if status is INPROGRESS', () => {
            const onHumanInput = jest.fn()
            renderWithTheme(<NodeExecutionDetail node={virtualNode({ status: 'INPROGRESS' })} {...baseProps} onHumanInput={onHumanInput} />)
            expect(screen.queryByTestId('hitl-action-bar')).not.toBeInTheDocument()
        })

        it('skips the header NodeIcon (avoids 404 on the synthesized nodeId)', () => {
            const { container } = renderWithTheme(<NodeExecutionDetail node={virtualNode({ nodeId: 'loop-iteration-0' })} {...baseProps} />)
            const imgs = container.querySelectorAll('img')
            const nodeIconImg = Array.from(imgs).find((el) => el.getAttribute('src')?.includes('/api/v1/node-icon/'))
            expect(nodeIconImg).toBeUndefined()
        })
    })
})
