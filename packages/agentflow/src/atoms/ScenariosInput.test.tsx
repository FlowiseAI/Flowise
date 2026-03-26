import { makeNodeData } from '@test-utils/factories'
import { fireEvent, render, screen } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { ScenariosInput } from './ScenariosInput'

// --- Mocks ---
const mockOnDataChange = jest.fn()

jest.mock('./NodeInputHandler', () => ({
    NodeInputHandler: ({
        inputParam,
        onDataChange
    }: {
        inputParam: InputParam
        data: NodeData
        onDataChange: (args: { inputParam: InputParam; newValue: unknown }) => void
    }) => (
        <div data-testid={`input-handler-${inputParam.name}`}>
            <label>{inputParam.label}</label>
            <input data-testid={`input-${inputParam.name}`} onChange={(e) => onDataChange({ inputParam, newValue: e.target.value })} />
        </div>
    )
}))

jest.mock('@tabler/icons-react', () => ({
    IconPlus: () => <span data-testid='icon-plus' />,
    IconTrash: () => <span data-testid='icon-trash' />
}))

jest.mock('./TooltipWithParser', () => ({
    TooltipWithParser: ({ title }: { title: string }) => <span data-testid='tooltip-with-parser'>{title}</span>
}))

const scenarioInputParam: InputParam = {
    id: 'conditionAgentScenarios',
    name: 'conditionAgentScenarios',
    label: 'Scenarios',
    type: 'array',
    array: [{ id: 'scenario', name: 'scenario', label: 'Scenario', type: 'string', default: '' } as InputParam]
}

const mockNodeData = makeNodeData({
    id: 'conditionAgentAgentflow_0',
    name: 'conditionAgentAgentflow',
    label: 'Condition Agent',
    inputValues: {}
})

describe('ScenariosInput', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should render section header with label and required indicator', () => {
        render(<ScenariosInput inputParam={scenarioInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        expect(screen.getByText('Scenarios')).toBeInTheDocument()
        expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('should render description tooltip when inputParam has description', () => {
        const paramWithDesc: InputParam = { ...scenarioInputParam, description: 'Define scenarios for splitting' }
        render(<ScenariosInput inputParam={paramWithDesc} data={mockNodeData} onDataChange={mockOnDataChange} />)

        expect(screen.getByTestId('tooltip-with-parser')).toBeInTheDocument()
    })

    it('should render scenario items with "Scenario N" labels', () => {
        const data = makeNodeData({
            ...mockNodeData,
            inputValues: {
                conditionAgentScenarios: [{ scenario: 'User is happy' }, { scenario: 'User is angry' }]
            }
        })

        render(<ScenariosInput inputParam={scenarioInputParam} data={data} onDataChange={mockOnDataChange} />)

        expect(screen.getByText('Scenario 0')).toBeInTheDocument()
        expect(screen.getByText('Scenario 1')).toBeInTheDocument()
    })

    it('should always render Else indicator', () => {
        render(<ScenariosInput inputParam={scenarioInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        expect(screen.getByText('Else')).toBeInTheDocument()
        expect(screen.getByText('Executes when no scenarios match')).toBeInTheDocument()
    })

    it('should render Add Scenario button', () => {
        render(<ScenariosInput inputParam={scenarioInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        expect(screen.getByRole('button', { name: /Add Scenario/i })).toBeInTheDocument()
    })

    it('should add a new scenario with default values', () => {
        render(<ScenariosInput inputParam={scenarioInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Add Scenario/i }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: scenarioInputParam,
            newValue: [{ scenario: '' }]
        })
    })

    it('should delete a scenario item', () => {
        const data = makeNodeData({
            ...mockNodeData,
            inputValues: {
                conditionAgentScenarios: [{ scenario: 'User is happy' }, { scenario: 'User is angry' }]
            }
        })

        render(<ScenariosInput inputParam={scenarioInputParam} data={data} onDataChange={mockOnDataChange} />)

        const deleteButtons = screen.getAllByTitle('Delete')
        fireEvent.click(deleteButtons[0])

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: scenarioInputParam,
            newValue: [{ scenario: 'User is angry' }]
        })
    })

    it('should handle nested field changes within a scenario', () => {
        const data = makeNodeData({
            ...mockNodeData,
            inputValues: {
                conditionAgentScenarios: [{ scenario: 'User is happy' }]
            }
        })

        render(<ScenariosInput inputParam={scenarioInputParam} data={data} onDataChange={mockOnDataChange} />)

        const scenarioInput = screen.getByTestId('input-scenario')
        fireEvent.change(scenarioInput, { target: { value: 'User is neutral' } })

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: scenarioInputParam,
            newValue: [{ scenario: 'User is neutral' }]
        })
    })

    it('should disable buttons when disabled prop is true', () => {
        const data = makeNodeData({
            ...mockNodeData,
            inputValues: {
                conditionAgentScenarios: [{ scenario: 'User is happy' }]
            }
        })

        render(<ScenariosInput inputParam={scenarioInputParam} data={data} disabled={true} onDataChange={mockOnDataChange} />)

        expect(screen.getByRole('button', { name: /Add Scenario/i })).toBeDisabled()
        expect(screen.getByTitle('Delete')).toBeDisabled()
    })

    it('should respect minItems constraint', () => {
        const inputParamWithMin: InputParam = { ...scenarioInputParam, minItems: 1 }
        const data = makeNodeData({
            ...mockNodeData,
            inputValues: {
                conditionAgentScenarios: [{ scenario: 'User is happy' }]
            }
        })

        render(<ScenariosInput inputParam={inputParamWithMin} data={data} onDataChange={mockOnDataChange} />)

        expect(screen.getByTitle('Delete')).toBeDisabled()
    })

    it('should render fields for each scenario item', () => {
        const data = makeNodeData({
            ...mockNodeData,
            inputValues: {
                conditionAgentScenarios: [{ scenario: 'User is happy' }, { scenario: 'User is angry' }]
            }
        })

        render(<ScenariosInput inputParam={scenarioInputParam} data={data} onDataChange={mockOnDataChange} />)

        expect(screen.getAllByTestId('input-handler-scenario')).toHaveLength(2)
    })

    it('should append to existing scenarios when adding', () => {
        const data = makeNodeData({
            ...mockNodeData,
            inputValues: {
                conditionAgentScenarios: [{ scenario: 'Existing scenario' }]
            }
        })

        render(<ScenariosInput inputParam={scenarioInputParam} data={data} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Add Scenario/i }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: scenarioInputParam,
            newValue: [{ scenario: 'Existing scenario' }, { scenario: '' }]
        })
    })
})
