import { fireEvent, render, screen } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { ArrayInput } from './ArrayInput'

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

describe('ArrayInput', () => {
    const mockInputParam: InputParam = {
        id: 'test-array',
        name: 'testArray',
        label: 'Test Item',
        type: 'array',
        array: [
            { id: 'field1', name: 'field1', label: 'Field 1', type: 'string', default: '' } as InputParam,
            { id: 'field2', name: 'field2', label: 'Field 2', type: 'number', default: 0 } as InputParam
        ]
    }

    const mockNodeData: NodeData = {
        id: 'node-1',
        name: 'testNode',
        label: 'Test Node',
        inputs: {}
    } as NodeData

    beforeEach(() => {
        jest.clearAllMocks()
    })

    // Test 1: Render existing items
    it('should render existing items correctly', () => {
        const dataWithItems: NodeData = {
            ...mockNodeData,
            inputs: {
                testArray: [
                    { field1: 'value1', field2: 10 },
                    { field1: 'value2', field2: 20 }
                ]
            }
        } as NodeData

        render(<ArrayInput inputParam={mockInputParam} data={dataWithItems} onDataChange={mockOnDataChange} />)

        // Verify both items are rendered
        expect(screen.getByText('0')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()

        // Verify field handlers are rendered for both items
        expect(screen.getAllByTestId('input-handler-field1')).toHaveLength(2)
        expect(screen.getAllByTestId('input-handler-field2')).toHaveLength(2)
    })

    // Test 2: Render Add button
    it('should render Add button with correct label', () => {
        render(<ArrayInput inputParam={mockInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        const addButton = screen.getByRole('button', { name: /Add Test Item/i })
        expect(addButton).toBeInTheDocument()
        expect(screen.getByTestId('icon-plus')).toBeInTheDocument()
    })

    // Test 3: Add new item
    it('should add new item and call onDataChange with new array', () => {
        render(<ArrayInput inputParam={mockInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        const addButton = screen.getByRole('button', { name: /Add Test Item/i })
        fireEvent.click(addButton)

        // Verify onDataChange was called with new array containing default values
        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ field1: '', field2: 0 }]
        })
    })

    // Test 4: Delete item
    it('should delete item and verify item removed from array', () => {
        const dataWithItems: NodeData = {
            ...mockNodeData,
            inputs: {
                testArray: [
                    { field1: 'value1', field2: 10 },
                    { field1: 'value2', field2: 20 }
                ]
            }
        } as NodeData

        render(<ArrayInput inputParam={mockInputParam} data={dataWithItems} onDataChange={mockOnDataChange} />)

        // Get all delete buttons (IconTrash buttons)
        const deleteButtons = screen.getAllByTitle('Delete')

        // Click the first delete button
        fireEvent.click(deleteButtons[0])

        // Verify onDataChange was called with updated array (first item removed)
        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ field1: 'value2', field2: 20 }]
        })
    })

    // Test 5: Handle field changes
    it('should handle nested field changes and update parent array', () => {
        const dataWithItems: NodeData = {
            ...mockNodeData,
            inputs: {
                testArray: [{ field1: 'initial', field2: 5 }]
            }
        } as NodeData

        render(<ArrayInput inputParam={mockInputParam} data={dataWithItems} onDataChange={mockOnDataChange} />)

        // Change field1 value
        const field1Input = screen.getByTestId('input-field1')
        fireEvent.change(field1Input, { target: { value: 'updated' } })

        // Verify parent array was updated
        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ field1: 'updated', field2: 5 }]
        })
    })

    // Test 6: Empty array initialization
    it('should render with empty array and only show Add button', () => {
        render(<ArrayInput inputParam={mockInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        // Verify no items are rendered
        expect(screen.queryByText('0')).not.toBeInTheDocument()

        // Verify Add button is present
        expect(screen.getByRole('button', { name: /Add Test Item/i })).toBeInTheDocument()
    })

    // Test 7: Respect disabled prop
    it('should disable buttons when disabled prop is true', () => {
        const dataWithItems: NodeData = {
            ...mockNodeData,
            inputs: {
                testArray: [{ field1: 'value1', field2: 10 }]
            }
        } as NodeData

        render(<ArrayInput inputParam={mockInputParam} data={dataWithItems} disabled={true} onDataChange={mockOnDataChange} />)

        // Verify Add button is disabled
        const addButton = screen.getByRole('button', { name: /Add Test Item/i })
        expect(addButton).toBeDisabled()

        // Verify Delete button is disabled
        const deleteButton = screen.getByTitle('Delete')
        expect(deleteButton).toBeDisabled()
    })

    // Test 8: Filter hidden fields
    it('should not render fields with display set to false', () => {
        const inputParamWithHiddenField: InputParam = {
            ...mockInputParam,
            array: [
                { id: 'visible', name: 'visible', label: 'Visible Field', type: 'string', display: true } as InputParam,
                { id: 'hidden', name: 'hidden', label: 'Hidden Field', type: 'string', display: false } as InputParam
            ]
        }

        const dataWithItems: NodeData = {
            ...mockNodeData,
            inputs: {
                testArray: [{ visible: 'test', hidden: 'should-not-show' }]
            }
        } as NodeData

        render(<ArrayInput inputParam={inputParamWithHiddenField} data={dataWithItems} onDataChange={mockOnDataChange} />)

        // Verify visible field is rendered
        expect(screen.getByTestId('input-handler-visible')).toBeInTheDocument()

        // Verify hidden field is NOT rendered
        expect(screen.queryByTestId('input-handler-hidden')).not.toBeInTheDocument()
    })

    // Test 9: Multiple items
    it('should render multiple items with correct indices', () => {
        const dataWithMultipleItems: NodeData = {
            ...mockNodeData,
            inputs: {
                testArray: [
                    { field1: 'item1', field2: 1 },
                    { field1: 'item2', field2: 2 },
                    { field1: 'item3', field2: 3 },
                    { field1: 'item4', field2: 4 }
                ]
            }
        } as NodeData

        render(<ArrayInput inputParam={mockInputParam} data={dataWithMultipleItems} onDataChange={mockOnDataChange} />)

        // Verify all indices are shown
        expect(screen.getByText('0')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()

        // Verify all field handlers are rendered (4 items * 2 fields each = 8 handlers)
        expect(screen.getAllByTestId('input-handler-field1')).toHaveLength(4)
        expect(screen.getAllByTestId('input-handler-field2')).toHaveLength(4)
    })

    // Test 10: Default values
    it('should initialize new items with field default values', () => {
        const inputParamWithDefaults: InputParam = {
            id: 'test-array',
            name: 'testArray',
            label: 'Test Item',
            type: 'array',
            array: [
                { id: 'name', name: 'name', label: 'Name', type: 'string', default: 'John Doe' } as InputParam,
                { id: 'age', name: 'age', label: 'Age', type: 'number', default: 25 } as InputParam,
                { id: 'active', name: 'active', label: 'Active', type: 'boolean', default: true } as InputParam
            ]
        }

        render(<ArrayInput inputParam={inputParamWithDefaults} data={mockNodeData} onDataChange={mockOnDataChange} />)

        const addButton = screen.getByRole('button', { name: /Add Test Item/i })
        fireEvent.click(addButton)

        // Verify new item initialized with correct default values
        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: inputParamWithDefaults,
            newValue: [{ name: 'John Doe', age: 25, active: true }]
        })
    })

    // minItems constraint
    it('should respect minItems constraint and disable delete when minimum reached', () => {
        const inputParamWithMinItems: InputParam = {
            ...mockInputParam,
            minItems: 2
        }

        const dataWithItems: NodeData = {
            ...mockNodeData,
            inputs: {
                testArray: [
                    { field1: 'value1', field2: 10 },
                    { field1: 'value2', field2: 20 }
                ]
            }
        } as NodeData

        render(<ArrayInput inputParam={inputParamWithMinItems} data={dataWithItems} onDataChange={mockOnDataChange} />)

        // Both delete buttons should be disabled when at minItems limit
        const deleteButtons = screen.getAllByTitle('Delete')
        expect(deleteButtons[0]).toBeDisabled()
        expect(deleteButtons[1]).toBeDisabled()
    })

    // Test 11: Type-specific defaults when no explicit default is provided
    it('should initialize new items with type-appropriate defaults when no default is specified', () => {
        const inputParamWithTypes: InputParam = {
            id: 'typed-array',
            name: 'testArray',
            label: 'Test Item',
            type: 'array',
            array: [
                { id: 'str', name: 'str', label: 'String', type: 'string' } as InputParam,
                { id: 'num', name: 'num', label: 'Number', type: 'number' } as InputParam,
                { id: 'bool', name: 'bool', label: 'Boolean', type: 'boolean' } as InputParam,
                { id: 'arr', name: 'arr', label: 'Array', type: 'array' } as InputParam
            ]
        }

        render(<ArrayInput inputParam={inputParamWithTypes} data={mockNodeData} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Add Test Item/i }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: inputParamWithTypes,
            newValue: [{ str: '', num: 0, bool: false, arr: [] }]
        })
    })

    // Test 12: Nested array sub-fields render recursively
    it('should render nested array sub-fields (e.g., addOptions inside formInputTypes)', () => {
        const nestedArrayParam: InputParam = {
            id: 'formInputTypes',
            name: 'formInputTypes',
            label: 'Form Input Type',
            type: 'array',
            array: [
                { id: 'type', name: 'type', label: 'Type', type: 'options', default: 'string' } as InputParam,
                { id: 'label', name: 'label', label: 'Label', type: 'string' } as InputParam,
                {
                    id: 'addOptions',
                    name: 'addOptions',
                    label: 'Add Options',
                    type: 'array',
                    display: true,
                    array: [{ id: 'option', name: 'option', label: 'Option', type: 'string' } as InputParam]
                } as InputParam
            ]
        }

        const dataWithNestedArray: NodeData = {
            ...mockNodeData,
            inputs: {
                formInputTypes: [
                    {
                        type: 'options',
                        label: 'Color',
                        addOptions: [{ option: 'Red' }, { option: 'Blue' }]
                    }
                ]
            }
        } as NodeData

        render(<ArrayInput inputParam={nestedArrayParam} data={dataWithNestedArray} onDataChange={mockOnDataChange} />)

        // The parent array item renders
        expect(screen.getByText('0')).toBeInTheDocument()

        // The nested array sub-field (addOptions) is rendered via NodeInputHandler
        // Since our mock NodeInputHandler renders a div with data-testid, the addOptions field should appear
        expect(screen.getByTestId('input-handler-addOptions')).toBeInTheDocument()
    })

    it('should hide nested array sub-fields when display is false', () => {
        const nestedArrayParam: InputParam = {
            id: 'formInputTypes',
            name: 'formInputTypes',
            label: 'Form Input Type',
            type: 'array',
            array: [
                { id: 'type', name: 'type', label: 'Type', type: 'options' } as InputParam,
                {
                    id: 'addOptions',
                    name: 'addOptions',
                    label: 'Add Options',
                    type: 'array',
                    display: false,
                    array: [{ id: 'option', name: 'option', label: 'Option', type: 'string' } as InputParam]
                } as InputParam
            ]
        }

        const dataWithNestedArray: NodeData = {
            ...mockNodeData,
            inputs: {
                formInputTypes: [{ type: 'string', label: 'Name' }]
            }
        } as NodeData

        render(<ArrayInput inputParam={nestedArrayParam} data={dataWithNestedArray} onDataChange={mockOnDataChange} />)

        expect(screen.getByTestId('input-handler-type')).toBeInTheDocument()
        expect(screen.queryByTestId('input-handler-addOptions')).not.toBeInTheDocument()
    })

    it('should use itemParameters to control nested array visibility per row', () => {
        const nestedArrayParam: InputParam = {
            id: 'formInputTypes',
            name: 'formInputTypes',
            label: 'Form Input Type',
            type: 'array',
            array: [
                { id: 'type', name: 'type', label: 'Type', type: 'options' } as InputParam,
                {
                    id: 'addOptions',
                    name: 'addOptions',
                    label: 'Add Options',
                    type: 'array',
                    array: [{ id: 'option', name: 'option', label: 'Option', type: 'string' } as InputParam]
                } as InputParam
            ]
        }

        const dataWithTwoRows: NodeData = {
            ...mockNodeData,
            inputs: {
                formInputTypes: [
                    { type: 'options', label: 'Color', addOptions: [{ option: 'Red' }] },
                    { type: 'string', label: 'Name' }
                ]
            }
        } as NodeData

        // Row 0: addOptions visible (type = options)
        // Row 1: addOptions hidden (type = string)
        const itemParameters: InputParam[][] = [
            [
                { id: 'type', name: 'type', label: 'Type', type: 'options', display: true } as InputParam,
                { id: 'addOptions', name: 'addOptions', label: 'Add Options', type: 'array', display: true } as InputParam
            ],
            [
                { id: 'type', name: 'type', label: 'Type', type: 'options', display: true } as InputParam,
                { id: 'addOptions', name: 'addOptions', label: 'Add Options', type: 'array', display: false } as InputParam
            ]
        ]

        render(
            <ArrayInput
                inputParam={nestedArrayParam}
                data={dataWithTwoRows}
                onDataChange={mockOnDataChange}
                itemParameters={itemParameters}
            />
        )

        // Both rows show their Type field
        expect(screen.getAllByTestId('input-handler-type')).toHaveLength(2)

        // Only row 0 shows addOptions (row 1 has display: false)
        expect(screen.getAllByTestId('input-handler-addOptions')).toHaveLength(1)
    })

    // Test 13: itemParameters prop overrides inputParam.array display flags
    it('should use itemParameters prop for field visibility when provided, ignoring inputParam.array display flags', () => {
        // inputParam.array has both fields with no display flag (both would show)
        const dataWithItem: NodeData = {
            ...mockNodeData,
            inputs: { testArray: [{ field1: 'value', field2: 10 }] }
        } as NodeData

        // Parent (EditNodeDialog) has evaluated field2 as hidden
        const itemParameters: InputParam[][] = [
            [
                { id: 'field1', name: 'field1', label: 'Field 1', type: 'string', display: true } as InputParam,
                { id: 'field2', name: 'field2', label: 'Field 2', type: 'number', display: false } as InputParam
            ]
        ]

        render(
            <ArrayInput inputParam={mockInputParam} data={dataWithItem} onDataChange={mockOnDataChange} itemParameters={itemParameters} />
        )

        // field1 visible per itemParameters
        expect(screen.getByTestId('input-handler-field1')).toBeInTheDocument()
        // field2 hidden per itemParameters even though inputParam.array has no display flag
        expect(screen.queryByTestId('input-handler-field2')).not.toBeInTheDocument()
    })

    // Test reading minItems from inputParam
    it('should read minItems from inputParam', () => {
        const inputParamWithMinItems: InputParam = {
            ...mockInputParam,
            minItems: 1
        }

        const dataWithOneItem: NodeData = {
            ...mockNodeData,
            inputs: {
                testArray: [{ field1: 'value1', field2: 10 }]
            }
        } as NodeData

        render(<ArrayInput inputParam={inputParamWithMinItems} data={dataWithOneItem} onDataChange={mockOnDataChange} />)

        // Delete button should be disabled when at minItems limit
        const deleteButton = screen.getByTitle('Delete')
        expect(deleteButton).toBeDisabled()
    })
})
