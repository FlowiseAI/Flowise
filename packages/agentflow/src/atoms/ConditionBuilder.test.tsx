import { fireEvent, render, screen } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { ConditionBuilder } from './ConditionBuilder'

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

const conditionInputParam: InputParam = {
    id: 'conditions',
    name: 'conditions',
    label: 'Conditions',
    type: 'array',
    array: [
        {
            id: 'type',
            name: 'type',
            label: 'Type',
            type: 'options',
            default: 'string',
            options: [
                { label: 'String', name: 'string' },
                { label: 'Number', name: 'number' },
                { label: 'Boolean', name: 'boolean' }
            ]
        } as InputParam,
        { id: 'value1', name: 'value1', label: 'Value 1', type: 'string', default: '' } as InputParam,
        { id: 'operation', name: 'operation', label: 'Operation', type: 'options', default: 'equal' } as InputParam,
        { id: 'value2', name: 'value2', label: 'Value 2', type: 'string', default: '' } as InputParam
    ]
}

const mockNodeData: NodeData = {
    id: 'conditionAgentflow_0',
    name: 'conditionAgentflow',
    label: 'Condition',
    inputValues: {}
} as NodeData

describe('ConditionBuilder', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should render condition items with "Condition N" labels', () => {
        const data: NodeData = {
            ...mockNodeData,
            inputValues: {
                conditions: [
                    { type: 'string', value1: '', operation: 'equal', value2: '' },
                    { type: 'number', value1: '', operation: 'larger', value2: '' }
                ]
            }
        } as NodeData

        render(<ConditionBuilder inputParam={conditionInputParam} data={data} onDataChange={mockOnDataChange} />)

        expect(screen.getByText('Condition 0')).toBeInTheDocument()
        expect(screen.getByText('Condition 1')).toBeInTheDocument()
    })

    it('should always render Else indicator', () => {
        render(<ConditionBuilder inputParam={conditionInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        expect(screen.getByText('Else')).toBeInTheDocument()
        expect(screen.getByText('Executes when no conditions match')).toBeInTheDocument()
    })

    it('should render Add Condition button', () => {
        render(<ConditionBuilder inputParam={conditionInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        expect(screen.getByRole('button', { name: /Add Condition/i })).toBeInTheDocument()
    })

    it('should add a new condition with default values', () => {
        render(<ConditionBuilder inputParam={conditionInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Add Condition/i }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: conditionInputParam,
            newValue: [{ type: 'string', value1: '', operation: 'equal', value2: '' }]
        })
    })

    it('should delete a condition item', () => {
        const data: NodeData = {
            ...mockNodeData,
            inputValues: {
                conditions: [
                    { type: 'string', value1: 'a', operation: 'equal', value2: 'b' },
                    { type: 'number', value1: '1', operation: 'larger', value2: '0' }
                ]
            }
        } as NodeData

        render(<ConditionBuilder inputParam={conditionInputParam} data={data} onDataChange={mockOnDataChange} />)

        const deleteButtons = screen.getAllByTitle('Delete')
        fireEvent.click(deleteButtons[0])

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: conditionInputParam,
            newValue: [{ type: 'number', value1: '1', operation: 'larger', value2: '0' }]
        })
    })

    it('should handle nested field changes within a condition', () => {
        const data: NodeData = {
            ...mockNodeData,
            inputValues: {
                conditions: [{ type: 'string', value1: 'hello', operation: 'equal', value2: 'world' }]
            }
        } as NodeData

        render(<ConditionBuilder inputParam={conditionInputParam} data={data} onDataChange={mockOnDataChange} />)

        const value1Input = screen.getByTestId('input-value1')
        fireEvent.change(value1Input, { target: { value: 'changed' } })

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: conditionInputParam,
            newValue: [{ type: 'string', value1: 'changed', operation: 'equal', value2: 'world' }]
        })
    })

    it('should disable buttons when disabled prop is true', () => {
        const data: NodeData = {
            ...mockNodeData,
            inputValues: {
                conditions: [{ type: 'string', value1: '', operation: 'equal', value2: '' }]
            }
        } as NodeData

        render(<ConditionBuilder inputParam={conditionInputParam} data={data} disabled={true} onDataChange={mockOnDataChange} />)

        expect(screen.getByRole('button', { name: /Add Condition/i })).toBeDisabled()
        expect(screen.getByTitle('Delete')).toBeDisabled()
    })

    it('should respect minItems constraint', () => {
        const inputParamWithMin: InputParam = { ...conditionInputParam, minItems: 1 }
        const data: NodeData = {
            ...mockNodeData,
            inputValues: {
                conditions: [{ type: 'string', value1: '', operation: 'equal', value2: '' }]
            }
        } as NodeData

        render(<ConditionBuilder inputParam={inputParamWithMin} data={data} onDataChange={mockOnDataChange} />)

        expect(screen.getByTitle('Delete')).toBeDisabled()
    })

    it('should use itemParameters for field visibility when provided', () => {
        const data: NodeData = {
            ...mockNodeData,
            inputValues: {
                conditions: [{ type: 'string', value1: '', operation: 'isEmpty', value2: '' }]
            }
        } as NodeData

        // Simulate value2 hidden due to isEmpty operation
        const itemParameters: InputParam[][] = [
            [
                { id: 'type', name: 'type', label: 'Type', type: 'options', display: true } as InputParam,
                { id: 'value1', name: 'value1', label: 'Value 1', type: 'string', display: true } as InputParam,
                { id: 'operation', name: 'operation', label: 'Operation', type: 'options', display: true } as InputParam,
                { id: 'value2', name: 'value2', label: 'Value 2', type: 'string', display: false } as InputParam
            ]
        ]

        render(
            <ConditionBuilder
                inputParam={conditionInputParam}
                data={data}
                onDataChange={mockOnDataChange}
                itemParameters={itemParameters}
            />
        )

        expect(screen.getByTestId('input-handler-type')).toBeInTheDocument()
        expect(screen.getByTestId('input-handler-value1')).toBeInTheDocument()
        expect(screen.getByTestId('input-handler-operation')).toBeInTheDocument()
        expect(screen.queryByTestId('input-handler-value2')).not.toBeInTheDocument()
    })

    it('should render fields for each condition item', () => {
        const data: NodeData = {
            ...mockNodeData,
            inputValues: {
                conditions: [
                    { type: 'string', value1: '', operation: 'equal', value2: '' },
                    { type: 'number', value1: '', operation: 'larger', value2: '' }
                ]
            }
        } as NodeData

        render(<ConditionBuilder inputParam={conditionInputParam} data={data} onDataChange={mockOnDataChange} />)

        // Each condition should have its own set of fields
        expect(screen.getAllByTestId('input-handler-type')).toHaveLength(2)
        expect(screen.getAllByTestId('input-handler-value1')).toHaveLength(2)
        expect(screen.getAllByTestId('input-handler-operation')).toHaveLength(2)
        expect(screen.getAllByTestId('input-handler-value2')).toHaveLength(2)
    })
})
