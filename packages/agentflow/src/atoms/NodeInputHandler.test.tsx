import { render, screen } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { NodeInputHandler } from './NodeInputHandler'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('reactflow', () => ({
    Handle: () => null,
    Position: { Left: 'left' },
    useUpdateNodeInternals: () => jest.fn()
}))

jest.mock('@tabler/icons-react', () => ({
    IconArrowsMaximize: () => <span data-testid='icon-expand' />,
    IconVariable: () => <span data-testid='icon-variable' />,
    IconRefresh: () => <span data-testid='icon-refresh' />
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockOnDataChange = jest.fn()

const baseNodeData: NodeData = {
    id: 'node-1',
    name: 'testNode',
    label: 'Test Node',
    inputValues: {}
}

const makeParam = (overrides: Partial<InputParam>): InputParam => ({
    id: 'p1',
    name: 'myField',
    label: 'My Field',
    type: 'string',
    optional: false,
    additionalParams: true,
    ...overrides
})

beforeEach(() => {
    jest.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NodeInputHandler – static types', () => {
    it('renders a text input for string type', () => {
        render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'string' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        expect(screen.getByRole('textbox')).toBeTruthy()
    })

    it('renders nothing for asyncOptions when no AsyncInputComponent provided', () => {
        const { container } = render(
            <NodeInputHandler
                inputParam={makeParam({ type: 'asyncOptions' })}
                data={baseNodeData}
                isAdditionalParams
                onDataChange={mockOnDataChange}
            />
        )

        // Without AsyncInputComponent, async types render nothing
        expect(container.querySelector('input')).toBeNull()
    })
})
