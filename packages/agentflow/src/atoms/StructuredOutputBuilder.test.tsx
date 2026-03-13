import { fireEvent, render, screen } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { StructuredOutputBuilder } from './StructuredOutputBuilder'

// --- Mocks ---
const mockOnDataChange = jest.fn()

jest.mock('@tabler/icons-react', () => ({
    IconPlus: () => <span data-testid='icon-plus' />,
    IconTrash: () => <span data-testid='icon-trash' />
}))

describe('StructuredOutputBuilder', () => {
    const mockInputParam: InputParam = {
        id: 'structured-output',
        name: 'llmStructuredOutput',
        label: 'JSON Structured Output',
        type: 'array'
    }

    const mockNodeData: NodeData = {
        id: 'node-1',
        name: 'llmAgentflow',
        label: 'LLM',
        inputValues: {}
    } as NodeData

    beforeEach(() => {
        jest.clearAllMocks()
    })

    // --- Rendering ---

    it('should render section header and empty state with only Add button', () => {
        render(<StructuredOutputBuilder inputParam={mockInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        expect(screen.getByText('JSON Structured Output')).toBeInTheDocument()
        expect(screen.queryByText('0')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Add JSON Structured Output/i })).toBeInTheDocument()
    })

    it('should render existing entries with field labels', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [
                    { key: 'name', type: 'string', description: 'User name' },
                    { key: 'age', type: 'number', description: 'User age' }
                ]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        // Index chips
        expect(screen.getByText('0')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()

        // Field labels (2 entries × Key + Type + Description each)
        expect(screen.getAllByText('Key')).toHaveLength(2)
        expect(screen.getAllByText('Type')).toHaveLength(2)
        expect(screen.getAllByText('Description')).toHaveLength(2)

        // Key inputs
        const keyInputs = [screen.getByTestId('key-input-0'), screen.getByTestId('key-input-1')]
        expect(keyInputs[0].querySelector('input')).toHaveValue('name')
        expect(keyInputs[1].querySelector('input')).toHaveValue('age')

        // Type dropdowns
        const typeSelects = screen.getAllByRole('combobox')
        expect(typeSelects).toHaveLength(2)

        // Description inputs
        const descInputs = [screen.getByTestId('description-input-0'), screen.getByTestId('description-input-1')]
        expect(descInputs[0].querySelector('input')).toHaveValue('User name')
        expect(descInputs[1].querySelector('input')).toHaveValue('User age')
    })

    // --- Add ---

    it('should add a new entry with default type "string"', () => {
        render(<StructuredOutputBuilder inputParam={mockInputParam} data={mockNodeData} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Add JSON Structured Output/i }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ key: '', type: 'string', description: '' }]
        })
    })

    it('should append to existing entries when adding', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: 'name', type: 'string', description: '' }]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Add JSON Structured Output/i }))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [
                { key: 'name', type: 'string', description: '' },
                { key: '', type: 'string', description: '' }
            ]
        })
    })

    // --- Delete ---

    it('should delete an entry and call onDataChange with updated array', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [
                    { key: 'name', type: 'string', description: '' },
                    { key: 'age', type: 'number', description: '' }
                ]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        const deleteButtons = screen.getAllByTitle('Delete')
        fireEvent.click(deleteButtons[0])

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ key: 'age', type: 'number', description: '' }]
        })
    })

    // --- Key change ---

    it('should update key when text field changes', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: 'old', type: 'string', description: '' }]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        const keyInput = screen.getByTestId('key-input-0').querySelector('input')!
        fireEvent.change(keyInput, { target: { value: 'newKey' } })

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ key: 'newKey', type: 'string', description: '' }]
        })
    })

    // --- Type change ---

    it('should update type when dropdown changes', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: 'count', type: 'string', description: '' }]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        const typeSelect = screen.getByRole('combobox')
        fireEvent.mouseDown(typeSelect)
        fireEvent.click(screen.getByText('Number'))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ key: 'count', type: 'number', enumValues: '', jsonSchema: '', description: '' }]
        })
    })

    // --- Conditional fields ---

    it('should show Enum Values field when type is "enum"', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: 'status', type: 'enum', enumValues: 'active, inactive', description: '' }]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        expect(screen.getByText('Enum Values')).toBeInTheDocument()
        expect(screen.getByTestId('enum-values-0')).toBeInTheDocument()
        expect(screen.queryByTestId('json-schema-0')).not.toBeInTheDocument()
    })

    it('should show JSON Schema field when type is "jsonArray"', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: 'items', type: 'jsonArray', jsonSchema: '{}', description: '' }]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        expect(screen.getByText('JSON Schema')).toBeInTheDocument()
        expect(screen.getByTestId('json-schema-0')).toBeInTheDocument()
        expect(screen.queryByTestId('enum-values-0')).not.toBeInTheDocument()
    })

    it('should hide conditional fields for non-conditional types', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: 'name', type: 'string', description: '' }]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        expect(screen.queryByText('Enum Values')).not.toBeInTheDocument()
        expect(screen.queryByText('JSON Schema')).not.toBeInTheDocument()
    })

    it('should clear enumValues when switching type away from enum', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: 'status', type: 'enum', enumValues: 'a, b', description: '' }]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        const typeSelect = screen.getByRole('combobox')
        fireEvent.mouseDown(typeSelect)
        fireEvent.click(screen.getByText('String'))

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: mockInputParam,
            newValue: [{ key: 'status', type: 'string', enumValues: '', jsonSchema: '', description: '' }]
        })
    })

    // --- Disabled state ---

    it('should disable all controls when disabled prop is true', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: 'name', type: 'string', description: '' }]
            }
        } as NodeData

        render(
            <StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} disabled={true} onDataChange={mockOnDataChange} />
        )

        expect(screen.getByRole('button', { name: /Add JSON Structured Output/i })).toBeDisabled()
        expect(screen.getByTitle('Delete')).toBeDisabled()
        expect(screen.getByTestId('key-input-0').querySelector('input')).toBeDisabled()
    })

    // --- minItems ---

    it('should hide delete button when at minItems', () => {
        const inputParamWithMin: InputParam = {
            ...mockInputParam,
            minItems: 1
        }

        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: 'name', type: 'string', description: '' }]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={inputParamWithMin} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        expect(screen.queryByTitle('Delete')).not.toBeInTheDocument()
    })

    // --- maxItems ---

    it('should disable Add button when at maxItems', () => {
        const inputParamWithMax: InputParam = {
            ...mockInputParam,
            maxItems: 1
        }

        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: 'name', type: 'string', description: '' }]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={inputParamWithMax} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        expect(screen.getByRole('button', { name: /Add JSON Structured Output/i })).toBeDisabled()
    })

    // --- All six type options ---

    it('should render all six type options in the dropdown', () => {
        const dataWithEntries: NodeData = {
            ...mockNodeData,
            inputValues: {
                llmStructuredOutput: [{ key: '', type: 'string', description: '' }]
            }
        } as NodeData

        render(<StructuredOutputBuilder inputParam={mockInputParam} data={dataWithEntries} onDataChange={mockOnDataChange} />)

        fireEvent.mouseDown(screen.getByRole('combobox'))

        const options = screen.getAllByRole('option')
        const optionValues = options.map((opt) => opt.getAttribute('data-value'))
        expect(optionValues).toEqual(['string', 'stringArray', 'number', 'boolean', 'enum', 'jsonArray'])
    })
})
