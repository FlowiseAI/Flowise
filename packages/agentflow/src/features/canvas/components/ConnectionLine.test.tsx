import { Position } from 'reactflow'

import { render } from '@testing-library/react'

import { ConnectionLine } from './ConnectionLine'

// --- Mocks ---
let mockConnectionHandleId: string | null = null

jest.mock('reactflow', () => ({
    ...jest.requireActual('reactflow'),
    useStore: (selector: (state: { connectionHandleId: string | null }) => unknown) =>
        selector({ connectionHandleId: mockConnectionHandleId }),
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <div data-testid='edge-label-renderer'>{children}</div>
}))

jest.mock('@/core', () => ({
    AGENTFLOW_ICONS: [
        { name: 'conditionAgentflow', color: '#FF6B6B' },
        { name: 'humanInputAgentflow', color: '#4ECDC4' },
        { name: 'llmAgentflow', color: '#45B7D1' }
    ]
}))

describe('ConnectionLine', () => {
    const defaultProps = {
        fromX: 100,
        fromY: 200,
        toX: 300,
        toY: 400,
        fromPosition: Position.Right,
        toPosition: Position.Left
    }

    beforeEach(() => {
        mockConnectionHandleId = null
    })

    describe('edge label visibility', () => {
        it('should not render edge label for regular nodes', () => {
            mockConnectionHandleId = 'llmAgentflow_output_0'
            const { queryByTestId } = render(<ConnectionLine {...defaultProps} />)
            expect(queryByTestId('edge-label-renderer')).not.toBeInTheDocument()
        })

        it('should render edge label for conditionAgentflow nodes', () => {
            mockConnectionHandleId = 'conditionAgentflow_output-0'
            const { getByTestId } = render(<ConnectionLine {...defaultProps} />)
            expect(getByTestId('edge-label-renderer')).toBeInTheDocument()
        })

        it('should render edge label for conditionAgentAgentflow nodes', () => {
            mockConnectionHandleId = 'conditionAgentAgentflow_output-0'
            const { getByTestId } = render(<ConnectionLine {...defaultProps} />)
            expect(getByTestId('edge-label-renderer')).toBeInTheDocument()
        })

        it('should render edge label for humanInputAgentflow nodes', () => {
            mockConnectionHandleId = 'humanInputAgentflow_output-0'
            const { getByTestId } = render(<ConnectionLine {...defaultProps} />)
            expect(getByTestId('edge-label-renderer')).toBeInTheDocument()
        })
    })

    describe('edge label content', () => {
        it('should show numeric label for condition nodes', () => {
            mockConnectionHandleId = 'conditionAgentflow_output-2'
            const { getByText } = render(<ConnectionLine {...defaultProps} />)
            expect(getByText('2')).toBeInTheDocument()
        })

        it('should show "0" when condition handle has no numeric suffix', () => {
            mockConnectionHandleId = 'conditionAgentflow_output-0'
            const { getByText } = render(<ConnectionLine {...defaultProps} />)
            expect(getByText('0')).toBeInTheDocument()
        })

        it('should show "proceed" for humanInput first output (index 0)', () => {
            mockConnectionHandleId = 'humanInputAgentflow_output-0'
            const { getByText } = render(<ConnectionLine {...defaultProps} />)
            expect(getByText('proceed')).toBeInTheDocument()
        })

        it('should show "reject" for humanInput second output (index 1)', () => {
            mockConnectionHandleId = 'humanInputAgentflow_output-1'
            const { getByText } = render(<ConnectionLine {...defaultProps} />)
            expect(getByText('reject')).toBeInTheDocument()
        })

        it('should handle NaN suffix by defaulting to "0"', () => {
            mockConnectionHandleId = 'conditionAgentflow_output-notanumber'
            const { getByText } = render(<ConnectionLine {...defaultProps} />)
            expect(getByText('0')).toBeInTheDocument()
        })
    })

    describe('edge color', () => {
        it('should use the color from AGENTFLOW_ICONS for known nodes', () => {
            mockConnectionHandleId = 'conditionAgentflow_output-0'
            const { container } = render(<ConnectionLine {...defaultProps} />)
            const path = container.querySelector('path.animated')
            expect(path).toHaveAttribute('stroke', '#FF6B6B')
        })

        it('should render path element for any connection', () => {
            mockConnectionHandleId = 'llmAgentflow_output_0'
            const { container } = render(<ConnectionLine {...defaultProps} />)
            const path = container.querySelector('path.animated')
            expect(path).toBeInTheDocument()
            expect(path).toHaveAttribute('stroke', '#45B7D1')
        })
    })

    it('should handle null connectionHandleId gracefully', () => {
        mockConnectionHandleId = null
        const { container } = render(<ConnectionLine {...defaultProps} />)
        expect(container.querySelector('g')).toBeInTheDocument()
    })
})
