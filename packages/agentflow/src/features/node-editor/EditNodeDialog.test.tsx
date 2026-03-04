import { fireEvent, render, screen } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { EditNodeDialog } from './EditNodeDialog'

// --- Mocks ---
const mockUpdateNodeData = jest.fn()
const mockUpdateNodeInternals = jest.fn()

jest.mock('reactflow', () => ({
    ...jest.requireActual('reactflow'),
    useUpdateNodeInternals: () => mockUpdateNodeInternals
}))

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: {},
        updateNodeData: mockUpdateNodeData
    }),
    useConfigContext: () => ({
        isDarkMode: false
    })
}))

jest.mock('@/atoms', () => ({
    NodeInputHandler: ({
        inputParam,
        onDataChange,
        data
    }: {
        inputParam: InputParam
        data: NodeData
        onDataChange: (args: { inputParam: InputParam; newValue: unknown }) => void
    }) => {
        // Handle array type inputs differently
        if (inputParam.type === 'array') {
            const currentArray = (data.inputValues?.[inputParam.name] as Record<string, unknown>[]) || []

            return (
                <div data-testid={`input-handler-${inputParam.name}`}>
                    <button
                        data-testid={`add-${inputParam.name}`}
                        onClick={() => {
                            const newItem = inputParam.array?.reduce((acc, field) => {
                                acc[field.name] = field.default ?? ''
                                return acc
                            }, {} as Record<string, unknown>)
                            onDataChange({ inputParam, newValue: [...currentArray, newItem || {}] })
                        }}
                    >
                        Add {inputParam.label}
                    </button>
                    {currentArray.map((_, index) => (
                        <button
                            key={index}
                            data-testid={`delete-${inputParam.name}-${index}`}
                            onClick={() => {
                                const newArray = currentArray.filter((_, i) => i !== index)
                                onDataChange({ inputParam, newValue: newArray })
                            }}
                        >
                            Delete {index}
                        </button>
                    ))}
                    {currentArray.map((_, index) => (
                        <button
                            key={`change-${index}`}
                            data-testid={`change-${inputParam.name}-${index}`}
                            onClick={() => {
                                const newArray = [...currentArray]
                                newArray[index] = { ...newArray[index], updated: true }
                                onDataChange({ inputParam, newValue: newArray })
                            }}
                        >
                            Change {index}
                        </button>
                    ))}
                </div>
            )
        }

        // Default handler for other types
        return (
            <div data-testid={`input-handler-${inputParam.name}`}>
                <button data-testid={`change-${inputParam.name}`} onClick={() => onDataChange({ inputParam, newValue: 'test-value' })}>
                    Change {inputParam.name}
                </button>
            </div>
        )
    }
}))

jest.mock('@tabler/icons-react', () => ({
    IconCheck: () => <span data-testid='icon-check' />,
    IconInfoCircle: () => <span data-testid='icon-info' />,
    IconPencil: () => <span data-testid='icon-pencil' />,
    IconX: () => <span data-testid='icon-x' />
}))

describe('EditNodeDialog', () => {
    const nodeData: NodeData = {
        id: 'node-1',
        name: 'llmAgentflow',
        label: 'My LLM Node',
        inputValues: { model: 'gpt-4' }
    } as NodeData

    const inputParams: InputParam[] = [
        { name: 'model', label: 'Model', type: 'string' } as InputParam,
        { name: 'temperature', label: 'Temperature', type: 'number' } as InputParam,
        { id: 'hiddenParam', name: 'hiddenParam', label: 'Hidden', type: 'string', hide: { model: 'gpt-4' } } as InputParam
    ]

    const defaultProps = {
        show: true,
        dialogProps: {
            inputParams,
            data: nodeData,
            disabled: false
        },
        onCancel: jest.fn()
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return null when show is false', () => {
        const { container } = render(<EditNodeDialog {...defaultProps} show={false} />)
        expect(container.innerHTML).toBe('')
    })

    it('should render dialog when show is true', () => {
        render(<EditNodeDialog {...defaultProps} />)
        expect(screen.getByText('My LLM Node')).toBeInTheDocument()
    })

    it('should display the edit pencil button when data has id', () => {
        render(<EditNodeDialog {...defaultProps} />)
        expect(screen.getByTitle('Edit Name')).toBeInTheDocument()
    })

    it('should toggle to editing mode when pencil is clicked', () => {
        render(<EditNodeDialog {...defaultProps} />)
        // Click the icon inside the Avatar (event bubbles to Avatar's onClick)
        fireEvent.click(screen.getByTestId('icon-pencil'))
        expect(screen.getByTitle('Save Name')).toBeInTheDocument()
        expect(screen.getByTitle('Cancel')).toBeInTheDocument()
    })

    it('should save name on Enter key and call updateNodeData', () => {
        render(<EditNodeDialog {...defaultProps} />)

        // Enter editing mode
        fireEvent.click(screen.getByTestId('icon-pencil'))

        // Find the text field and press Enter
        const textField = screen.getByDisplayValue('My LLM Node')
        fireEvent.keyDown(textField, { key: 'Enter' })

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { label: expect.any(String) })
        expect(mockUpdateNodeInternals).toHaveBeenCalledWith('node-1')
        // Should exit editing mode
        expect(screen.queryByTitle('Save Name')).not.toBeInTheDocument()
    })

    it('should cancel editing on Escape key without saving', () => {
        render(<EditNodeDialog {...defaultProps} />)

        fireEvent.click(screen.getByTestId('icon-pencil'))
        const textField = screen.getByDisplayValue('My LLM Node')
        fireEvent.keyDown(textField, { key: 'Escape' })

        expect(mockUpdateNodeData).not.toHaveBeenCalled()
        expect(screen.queryByTitle('Save Name')).not.toBeInTheDocument()
    })

    it('should cancel editing on Cancel button click', () => {
        render(<EditNodeDialog {...defaultProps} />)

        fireEvent.click(screen.getByTestId('icon-pencil'))
        // Click the X icon inside the Cancel Avatar
        fireEvent.click(screen.getByTestId('icon-x'))

        expect(mockUpdateNodeData).not.toHaveBeenCalled()
        expect(screen.queryByTitle('Save Name')).not.toBeInTheDocument()
    })

    it('should save name on Save button click', () => {
        render(<EditNodeDialog {...defaultProps} />)

        fireEvent.click(screen.getByTestId('icon-pencil'))
        // Click the check icon inside the Save Avatar
        fireEvent.click(screen.getByTestId('icon-check'))

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { label: expect.any(String) })
        expect(mockUpdateNodeInternals).toHaveBeenCalledWith('node-1')
    })

    it('should render hint section when data.hint exists', () => {
        const propsWithHint = {
            ...defaultProps,
            dialogProps: {
                ...defaultProps.dialogProps,
                data: { ...nodeData, hint: 'This is a helpful hint' }
            }
        }
        render(<EditNodeDialog {...propsWithHint} />)
        expect(screen.getByText('This is a helpful hint')).toBeInTheDocument()
    })

    it('should not render hint section when data.hint is absent', () => {
        render(<EditNodeDialog {...defaultProps} />)
        expect(screen.queryByTestId('icon-info')).not.toBeInTheDocument()
    })

    it('should filter out input params with display === false', () => {
        render(<EditNodeDialog {...defaultProps} />)

        expect(screen.getByTestId('input-handler-model')).toBeInTheDocument()
        expect(screen.getByTestId('input-handler-temperature')).toBeInTheDocument()
        expect(screen.queryByTestId('input-handler-hiddenParam')).not.toBeInTheDocument()
    })

    it('should call updateNodeData when onCustomDataChange fires', () => {
        render(<EditNodeDialog {...defaultProps} />)

        fireEvent.click(screen.getByTestId('change-model'))

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
            inputValues: { model: 'test-value' }
        })
    })

    it('should merge new input values with existing ones', () => {
        render(<EditNodeDialog {...defaultProps} />)

        fireEvent.click(screen.getByTestId('change-temperature'))

        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
            inputValues: expect.objectContaining({
                model: 'gpt-4',
                temperature: 'test-value'
            })
        })
    })

    it('should preserve hidden field values in state (not strip on keystroke)', () => {
        // Setup: provider=openAI with openAIModel selected
        const visibilityParams: InputParam[] = [
            {
                id: 'provider',
                name: 'provider',
                label: 'Provider',
                type: 'options',
                options: [
                    { label: 'OpenAI', name: 'openAI' },
                    { label: 'Google', name: 'google' }
                ]
            },
            {
                id: 'openAIModel',
                name: 'openAIModel',
                label: 'OpenAI Model',
                type: 'string',
                show: { provider: 'openAI' }
            },
            {
                id: 'googleModel',
                name: 'googleModel',
                label: 'Google Model',
                type: 'string',
                show: { provider: 'google' }
            }
        ]

        const visibilityData: NodeData = {
            id: 'node-vis',
            name: 'testNode',
            label: 'Test',
            inputValues: { provider: 'openAI', openAIModel: 'gpt-4', googleModel: '' }
        } as NodeData

        render(
            <EditNodeDialog
                show={true}
                dialogProps={{ inputParams: visibilityParams, data: visibilityData, disabled: false }}
                onCancel={jest.fn()}
            />
        )

        // Switch provider to google — openAIModel becomes hidden
        fireEvent.click(screen.getByTestId('change-provider'))

        // updateNodeData should keep openAIModel in inputValues (not stripped)
        expect(mockUpdateNodeData).toHaveBeenCalledWith(
            'node-vis',
            expect.objectContaining({
                inputValues: expect.objectContaining({
                    openAIModel: 'gpt-4' // preserved, not stripped
                })
            })
        )
    })

    // ========================================================================
    // Integration Tests - Array Input
    // ========================================================================

    describe('Array input integration', () => {
        it('should render ArrayInput component via NodeInputHandler for array type inputs', () => {
            const arrayInputParams: InputParam[] = [
                {
                    name: 'items',
                    label: 'Item',
                    type: 'array',
                    array: [
                        { name: 'name', label: 'Name', type: 'string' } as InputParam,
                        { name: 'value', label: 'Value', type: 'number' } as InputParam
                    ]
                } as InputParam
            ]

            const propsWithArrayInput = {
                ...defaultProps,
                dialogProps: {
                    ...defaultProps.dialogProps,
                    inputParams: arrayInputParams,
                    data: {
                        ...nodeData,
                        inputValues: { items: [] }
                    }
                }
            }

            render(<EditNodeDialog {...propsWithArrayInput} />)

            // Verify ArrayInput is rendered by checking for the "Add {label}" button
            expect(screen.getByTestId('add-items')).toBeInTheDocument()
            expect(screen.getByText('Add Item')).toBeInTheDocument()
        })

        it('should handle array data updates flowing through EditNodeDialog', () => {
            const arrayInputParams: InputParam[] = [
                {
                    name: 'connections',
                    label: 'Connection',
                    type: 'array',
                    array: [
                        { name: 'host', label: 'Host', type: 'string', default: 'localhost' } as InputParam,
                        { name: 'port', label: 'Port', type: 'number', default: 5432 } as InputParam
                    ]
                } as InputParam
            ]

            const initialArrayData = [
                { host: 'server1.com', port: 3000 },
                { host: 'server2.com', port: 8080 }
            ]

            const propsWithArrayData = {
                ...defaultProps,
                dialogProps: {
                    ...defaultProps.dialogProps,
                    inputParams: arrayInputParams,
                    data: {
                        ...nodeData,
                        inputValues: { connections: initialArrayData }
                    }
                }
            }

            render(<EditNodeDialog {...propsWithArrayData} />)

            // Verify initial state has delete and change buttons for existing items
            expect(screen.getByTestId('delete-connections-0')).toBeInTheDocument()
            expect(screen.getByTestId('delete-connections-1')).toBeInTheDocument()
            expect(screen.getByTestId('change-connections-0')).toBeInTheDocument()
            expect(screen.getByTestId('change-connections-1')).toBeInTheDocument()

            // Test Add operation - adds a new item with default values
            const addButton = screen.getByTestId('add-connections')
            fireEvent.click(addButton)

            expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
                inputValues: {
                    connections: [
                        { host: 'server1.com', port: 3000 },
                        { host: 'server2.com', port: 8080 },
                        { host: 'localhost', port: 5432 }
                    ]
                }
            })

            // Clear mock calls for next test
            mockUpdateNodeData.mockClear()

            // Test Delete operation - removes first item
            const deleteButton = screen.getByTestId('delete-connections-0')
            fireEvent.click(deleteButton)

            // Should be called with updated array (first item removed)
            expect(mockUpdateNodeData).toHaveBeenCalledTimes(1)
            expect(mockUpdateNodeData).toHaveBeenCalledWith(
                'node-1',
                expect.objectContaining({
                    inputValues: expect.objectContaining({
                        connections: expect.arrayContaining([{ host: 'server2.com', port: 8080 }])
                    })
                })
            )

            // Clear mock calls for next test
            mockUpdateNodeData.mockClear()

            // Test Change operation - modifies an item
            const changeButton = screen.getByTestId('change-connections-0')
            fireEvent.click(changeButton)

            // Verify updateNodeData was called with array update
            expect(mockUpdateNodeData).toHaveBeenCalledTimes(1)
            const lastCall = mockUpdateNodeData.mock.calls[0]
            expect(lastCall[0]).toBe('node-1')
            expect(lastCall[1]).toHaveProperty('inputValues')
            expect(lastCall[1].inputValues).toHaveProperty('connections')
            expect(Array.isArray(lastCall[1].inputValues.connections)).toBe(true)
        })
    })
})
