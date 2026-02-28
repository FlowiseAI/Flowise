import { makeNodeData } from '@test-utils/factories'
import { render, screen, waitFor } from '@testing-library/react'

import type { NodeData } from '@/core/types'

import { useFlowNodes } from './useFlowNodes'

// Mutable container so the hoisted jest.mock() factory can reference values that
// tests reassign in beforeEach. The indirection (mockNodesApi delegates to mocks.getAllNodes)
// is necessary because the source accesses nodesApi.getAllNodes through the context object —
// if it destructured getAllNodes at import time this pattern would break.
const mocks = {
    getAllNodes: jest.fn(),
    components: undefined as string[] | undefined
}

// Stable references to prevent useEffect infinite loops
// (the real context uses useMemo, so references are stable)
const mockNodesApi = { getAllNodes: (...args: unknown[]) => mocks.getAllNodes(...args) }
const mockApiContextValue = { nodesApi: mockNodesApi }

jest.mock('@/infrastructure/store', () => ({
    useApiContext: () => mockApiContextValue,
    useConfigContext: () => ({
        components: mocks.components
    })
}))

/** Test component that renders the hook state as text */
function TestComponent() {
    const { availableNodes, isLoading, error } = useFlowNodes()
    return (
        <div>
            <span data-testid='loading'>{String(isLoading)}</span>
            <span data-testid='error'>{error ? error.message : 'none'}</span>
            <span data-testid='count'>{availableNodes.length}</span>
            <span data-testid='names'>{availableNodes.map((n) => n.name).join(',')}</span>
        </div>
    )
}

describe('useFlowNodes', () => {
    const agentflowNode = makeNodeData({ name: 'llmAgentflow', label: 'LLM', category: 'Agent Flows' } as Partial<NodeData>)
    const startNode = makeNodeData({ name: 'startAgentflow', label: 'Start', category: 'Agent Flows' } as Partial<NodeData>)
    const nonAgentflowNode = makeNodeData({ name: 'chatOpenAI', label: 'ChatOpenAI', category: 'Chat Models' } as Partial<NodeData>)
    const toolNode = makeNodeData({ name: 'toolAgentflow', label: 'Tool', category: 'Agent Flows' } as Partial<NodeData>)

    const allNodes = [agentflowNode, startNode, nonAgentflowNode, toolNode]

    beforeEach(() => {
        jest.clearAllMocks()
        mocks.components = undefined
        mocks.getAllNodes.mockResolvedValue(allNodes)
    })

    it('should filter nodes to only Agent Flows category', async () => {
        render(<TestComponent />)

        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

        expect(screen.getByTestId('count').textContent).toBe('3')
        expect(screen.getByTestId('error').textContent).toBe('none')
    })

    it('should start in loading state', () => {
        mocks.getAllNodes.mockReturnValue(new Promise(() => {})) // never resolves
        render(<TestComponent />)

        expect(screen.getByTestId('loading').textContent).toBe('true')
        expect(screen.getByTestId('count').textContent).toBe('0')
    })

    it('should set error state on API failure', async () => {
        const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
        mocks.getAllNodes.mockRejectedValue(new Error('Network error'))

        render(<TestComponent />)

        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

        expect(screen.getByTestId('error').textContent).toBe('Network error')
        spy.mockRestore()
    })

    it('should wrap non-Error throws in Error', async () => {
        const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
        mocks.getAllNodes.mockRejectedValue('string error')

        render(<TestComponent />)

        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

        expect(screen.getByTestId('error').textContent).toBe('Failed to load nodes')
        spy.mockRestore()
    })

    describe('component allowlist filtering', () => {
        it('should filter to allowed components when allowedComponents is set', async () => {
            mocks.components = ['llmAgentflow']

            render(<TestComponent />)

            await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

            const names = screen.getByTestId('names').textContent
            expect(names).toContain('llmAgentflow')
            expect(names).toContain('startAgentflow') // always included
            expect(names).not.toContain('toolAgentflow')
        })

        it('should always include startAgentflow even when not in allowedComponents', async () => {
            mocks.components = ['toolAgentflow']

            render(<TestComponent />)

            await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

            const names = screen.getByTestId('names').textContent
            expect(names).toContain('startAgentflow')
            expect(names).toContain('toolAgentflow')
            expect(names).not.toContain('llmAgentflow')
        })

        it('should return all agentflow nodes when allowedComponents is empty', async () => {
            mocks.components = []

            render(<TestComponent />)

            await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

            expect(screen.getByTestId('count').textContent).toBe('3')
        })

        it('should return all agentflow nodes when allowedComponents is undefined', async () => {
            mocks.components = undefined

            render(<TestComponent />)

            await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

            expect(screen.getByTestId('count').textContent).toBe('3')
        })
    })
})
