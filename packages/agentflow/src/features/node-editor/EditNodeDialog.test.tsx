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

const mockCleanupOrphanedEdges = jest.fn()

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: { nodes: [], edges: [] },
        updateNodeData: mockUpdateNodeData
    }),
    useConfigContext: () => ({
        isDarkMode: false
    })
}))

jest.mock('./useDynamicOutputPorts', () => ({
    useDynamicOutputPorts: () => ({
        cleanupOrphanedEdges: mockCleanupOrphanedEdges
    })
}))

jest.mock('@/core/utils', () => ({
    ...jest.requireActual('@/core/utils'),
    buildDynamicOutputAnchors: (nodeId: string, count: number, labelPrefix: string, includeElse: boolean = true) => {
        const anchors = []
        for (let i = 0; i < count; i++) {
            anchors.push({
                id: `${nodeId}-output-${i}`,
                name: `${i}`,
                label: `${i}`,
                type: labelPrefix,
                description: `${labelPrefix} ${i}`
            })
        }
        if (includeElse) {
            anchors.push({ id: `${nodeId}-output-${count}`, name: `${count}`, label: `${count}`, type: labelPrefix, description: 'Else' })
        }
        return anchors
    }
}))

jest.mock('@/atoms', () => ({
    NodeInputHandler: ({
        inputParam,
        onDataChange,
        data,
        itemParameters
    }: {
        inputParam: InputParam
        data: NodeData
        onDataChange: (args: { inputParam: InputParam; newValue: unknown }) => void
        itemParameters?: InputParam[][]
    }) => {
        // Handle array type inputs differently
        if (inputParam.type === 'array') {
            const currentArray = (data.inputValues?.[inputParam.name] as Record<string, unknown>[]) || []

            return (
                <div data-testid={`input-handler-${inputParam.name}`} data-item-params-count={itemParameters?.length ?? 'none'}>
                    <button
                        data-testid={`add-${inputParam.name}`}
                        onClick={() => {
                            onDataChange({ inputParam, newValue: [...currentArray, { _mockAdded: true }] })
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
                    {currentArray.map((item, index) => (
                        <button
                            key={`set-type-options-${index}`}
                            data-testid={`set-type-options-${inputParam.name}-${index}`}
                            onClick={() => {
                                const newArray = [...currentArray]
                                newArray[index] = { ...newArray[index], type: 'options' }
                                onDataChange({ inputParam, newValue: newArray })
                            }}
                        >
                            Set Type Options {index}
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
    },
    MessagesInput: ({
        inputParam,
        onDataChange,
        data
    }: {
        inputParam: InputParam
        data: NodeData
        onDataChange: (args: { inputParam: InputParam; newValue: unknown }) => void
    }) => {
        const currentMessages = (data.inputValues?.[inputParam.name] as Array<{ role: string; content: string }>) || []
        return (
            <div data-testid={`messages-input-${inputParam.name}`}>
                <button
                    data-testid={`add-message-${inputParam.name}`}
                    onClick={() => {
                        onDataChange({
                            inputParam,
                            newValue: [...currentMessages, { role: 'user', content: '' }]
                        })
                    }}
                >
                    Add Message
                </button>
            </div>
        )
    },
    StructuredOutputBuilder: ({
        inputParam,
        onDataChange,
        data
    }: {
        inputParam: InputParam
        data: NodeData
        onDataChange: (args: { inputParam: InputParam; newValue: unknown }) => void
    }) => {
        const currentEntries = (data.inputValues?.[inputParam.name] as Array<{ key: string; type: string; description: string }>) || []
        return (
            <div data-testid={`structured-output-${inputParam.name}`}>
                <button
                    data-testid={`add-output-${inputParam.name}`}
                    onClick={() => {
                        onDataChange({
                            inputParam,
                            newValue: [...currentEntries, { key: '', type: 'string', description: '' }]
                        })
                    }}
                >
                    Add Output
                </button>
            </div>
        )
    },
    ConditionBuilder: ({
        inputParam,
        onDataChange,
        data
    }: {
        inputParam: InputParam
        data: NodeData
        onDataChange: (args: { inputParam: InputParam; newValue: unknown }) => void
    }) => {
        const currentArray = (data.inputValues?.[inputParam.name] as Record<string, unknown>[]) || []
        return (
            <div data-testid='condition-builder'>
                <button
                    data-testid='add-condition'
                    onClick={() => {
                        onDataChange({
                            inputParam,
                            newValue: [...currentArray, { type: 'string', value1: '', operation: 'equal', value2: '' }]
                        })
                    }}
                >
                    Add Condition
                </button>
            </div>
        )
    },
    ScenariosInput: ({
        inputParam,
        onDataChange,
        data
    }: {
        inputParam: InputParam
        data: NodeData
        onDataChange: (args: { inputParam: InputParam; newValue: unknown }) => void
    }) => {
        const currentArray = (data.inputValues?.[inputParam.name] as Record<string, unknown>[]) || []
        return (
            <div data-testid='scenarios-input'>
                <button
                    data-testid='add-scenario'
                    onClick={() => {
                        onDataChange({
                            inputParam,
                            newValue: [...currentArray, { scenario: '' }]
                        })
                    }}
                >
                    Add Scenario
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

// --- Start Node Fixture Factory ---
/**
 * Creates the full set of Start node input params used across multiple tests.
 * The `overrides` parameter allows individual tests to customise specific params
 * (e.g. omitting array children to test the chatInput-hidden case).
 */
function createStartNodeInputParams(overrides?: { includeFormInputTypesArray?: boolean }): InputParam[] {
    const includeArray = overrides?.includeFormInputTypesArray ?? true

    return [
        {
            id: 'startInputType',
            name: 'startInputType',
            label: 'Input Type',
            type: 'options',
            options: [
                { label: 'Chat Input', name: 'chatInput' },
                { label: 'Form Input', name: 'formInput' }
            ],
            default: 'chatInput'
        } as InputParam,
        {
            id: 'formTitle',
            name: 'formTitle',
            label: 'Form Title',
            type: 'string',
            show: { startInputType: 'formInput' }
        } as InputParam,
        {
            id: 'formDescription',
            name: 'formDescription',
            label: 'Form Description',
            type: 'string',
            show: { startInputType: 'formInput' }
        } as InputParam,
        {
            id: 'formInputTypes',
            name: 'formInputTypes',
            label: 'Form Input Types',
            type: 'array',
            show: { startInputType: 'formInput' },
            ...(includeArray
                ? {
                      array: [
                          { id: 'type', name: 'type', label: 'Type', type: 'options', default: 'string' } as InputParam,
                          { id: 'label', name: 'label', label: 'Label', type: 'string' } as InputParam,
                          { id: 'name', name: 'name', label: 'Variable Name', type: 'string' } as InputParam,
                          {
                              id: 'addOptions',
                              name: 'addOptions',
                              label: 'Add Options',
                              type: 'array',
                              show: { 'formInputTypes[$index].type': 'options' },
                              array: [{ id: 'option', name: 'option', label: 'Option', type: 'string' } as InputParam]
                          } as InputParam
                      ]
                  }
                : {})
        } as InputParam
    ]
}

function createStartNodeData(inputValues: Record<string, unknown>): NodeData {
    return {
        id: 'startAgentflow_0',
        name: 'startAgentflow',
        label: 'Start',
        inputValues
    } as NodeData
}

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
    // Async-driven Field Visibility (FLOWISE-233 integration)
    // ========================================================================

    describe('async-driven visibility', () => {
        it('shows a field hidden by an asyncOptions value when that value is selected', () => {
            const asyncParams: InputParam[] = [
                { id: 'model', name: 'model', label: 'Model', type: 'asyncOptions', loadMethod: 'listModels' } as InputParam,
                { id: 'temp', name: 'temperature', label: 'Temperature', type: 'number', show: { model: 'test-value' } } as InputParam
            ]
            const asyncData: NodeData = { ...nodeData, id: 'node-async', inputValues: { model: '' } }

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: asyncParams, data: asyncData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            // Temperature is hidden while model is empty
            expect(screen.queryByTestId('input-handler-temperature')).not.toBeInTheDocument()

            // User picks a value from the async dropdown
            fireEvent.click(screen.getByTestId('change-model'))

            // Visibility engine re-runs: temperature is now shown
            expect(screen.getByTestId('input-handler-temperature')).toBeInTheDocument()
        })

        it('shows a field hidden by an asyncMultiOptions value when that value is selected', () => {
            const asyncParams: InputParam[] = [
                {
                    id: 'tools',
                    name: 'tools',
                    label: 'Tools',
                    type: 'asyncMultiOptions',
                    loadMethod: 'listTools',
                    optional: true
                } as InputParam,
                { id: 'cfg', name: 'toolConfig', label: 'Tool Config', type: 'string', show: { tools: 'test-value' } } as InputParam
            ]
            const asyncData: NodeData = { ...nodeData, id: 'node-multi', inputValues: { tools: '' } }

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: asyncParams, data: asyncData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            expect(screen.queryByTestId('input-handler-toolConfig')).not.toBeInTheDocument()

            fireEvent.click(screen.getByTestId('change-tools'))

            expect(screen.getByTestId('input-handler-toolConfig')).toBeInTheDocument()
        })

        it('hides a field when asyncOptions value no longer satisfies its show condition', () => {
            const asyncParams: InputParam[] = [
                { id: 'model', name: 'model', label: 'Model', type: 'asyncOptions', loadMethod: 'listModels' } as InputParam,
                { id: 'temp', name: 'temperature', label: 'Temperature', type: 'number', show: { model: 'gpt-4o' } } as InputParam
            ]
            // Start with temperature visible (model === 'gpt-4o')
            const asyncData: NodeData = { ...nodeData, id: 'node-hide', inputValues: { model: 'gpt-4o', temperature: '0.5' } }

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: asyncParams, data: asyncData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            expect(screen.getByTestId('input-handler-temperature')).toBeInTheDocument()

            // Changing model fires onDataChange with 'test-value', which no longer satisfies show: { model: 'gpt-4o' }
            fireEvent.click(screen.getByTestId('change-model'))

            expect(screen.queryByTestId('input-handler-temperature')).not.toBeInTheDocument()
        })
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

            // Test Add operation - appends a new item to the array
            const addButton = screen.getByTestId('add-connections')
            fireEvent.click(addButton)

            expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
                inputValues: {
                    connections: [{ host: 'server1.com', port: 3000 }, { host: 'server2.com', port: 8080 }, { _mockAdded: true }]
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

        it('should render ConditionBuilder for conditionAgentflow node', () => {
            const conditionParams: InputParam[] = [
                {
                    name: 'conditions',
                    label: 'Conditions',
                    type: 'array',
                    array: [{ name: 'type', label: 'Type', type: 'options' } as InputParam]
                } as InputParam
            ]

            const conditionData: NodeData = {
                id: 'conditionAgentflow_0',
                name: 'conditionAgentflow',
                label: 'Condition',
                inputValues: { conditions: [{ type: 'string', value1: '', operation: 'equal', value2: '' }] }
            } as NodeData

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: conditionParams, data: conditionData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            expect(screen.getByTestId('condition-builder')).toBeInTheDocument()
            // Should NOT render generic NodeInputHandler for the conditions param
            expect(screen.queryByTestId('input-handler-conditions')).not.toBeInTheDocument()
        })

        it('should merge outputAnchors into a single updateNodeData call when conditions change', () => {
            const conditionParams: InputParam[] = [
                {
                    name: 'conditions',
                    label: 'Conditions',
                    type: 'array',
                    array: [{ name: 'type', label: 'Type', type: 'options' } as InputParam]
                } as InputParam
            ]

            const conditionData: NodeData = {
                id: 'conditionAgentflow_0',
                name: 'conditionAgentflow',
                label: 'Condition',
                inputValues: { conditions: [{ type: 'string', value1: '', operation: 'equal', value2: '' }] }
            } as NodeData

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: conditionParams, data: conditionData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            fireEvent.click(screen.getByTestId('add-condition'))

            // Should merge inputValues, outputAnchors, and cleaned edges into a single updateNodeData call
            expect(mockCleanupOrphanedEdges).toHaveBeenCalledWith(2)
            expect(mockUpdateNodeData).toHaveBeenCalledWith(
                'conditionAgentflow_0',
                {
                    inputValues: expect.objectContaining({ conditions: expect.any(Array) }),
                    outputAnchors: expect.arrayContaining([
                        expect.objectContaining({ description: 'Condition 0' }),
                        expect.objectContaining({ description: 'Condition 1' }),
                        expect.objectContaining({ description: 'Else' })
                    ])
                },
                undefined // cleanupOrphanedEdges returns undefined when no edges removed
            )
        })

        it('should render ScenariosInput for conditionAgentAgentflow node', () => {
            const scenarioParams: InputParam[] = [
                {
                    name: 'conditionAgentScenarios',
                    label: 'Scenarios',
                    type: 'array',
                    array: [{ name: 'scenario', label: 'Scenario', type: 'string' } as InputParam]
                } as InputParam
            ]

            const scenarioData: NodeData = {
                id: 'conditionAgentAgentflow_0',
                name: 'conditionAgentAgentflow',
                label: 'Condition Agent',
                inputValues: { conditionAgentScenarios: [{ scenario: 'User is happy' }] }
            } as NodeData

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: scenarioParams, data: scenarioData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            expect(screen.getByTestId('scenarios-input')).toBeInTheDocument()
            // Should NOT render generic NodeInputHandler for the scenarios param
            expect(screen.queryByTestId('input-handler-conditionAgentScenarios')).not.toBeInTheDocument()
        })

        it('should merge outputAnchors into a single updateNodeData call when scenarios change', () => {
            const scenarioParams: InputParam[] = [
                {
                    name: 'conditionAgentScenarios',
                    label: 'Scenarios',
                    type: 'array',
                    array: [{ name: 'scenario', label: 'Scenario', type: 'string' } as InputParam]
                } as InputParam
            ]

            const scenarioData: NodeData = {
                id: 'conditionAgentAgentflow_0',
                name: 'conditionAgentAgentflow',
                label: 'Condition Agent',
                inputValues: { conditionAgentScenarios: [{ scenario: 'User is happy' }] }
            } as NodeData

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: scenarioParams, data: scenarioData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            fireEvent.click(screen.getByTestId('add-scenario'))

            // Adding to 1 item → 2 items → 2 anchors (Scenario 0, Scenario 1) — no Else port
            expect(mockCleanupOrphanedEdges).toHaveBeenCalledWith(2)
            expect(mockUpdateNodeData).toHaveBeenCalledWith(
                'conditionAgentAgentflow_0',
                {
                    inputValues: expect.objectContaining({ conditionAgentScenarios: expect.any(Array) }),
                    outputAnchors: expect.arrayContaining([
                        expect.objectContaining({ description: 'Scenario 0' }),
                        expect.objectContaining({ description: 'Scenario 1' })
                    ])
                },
                undefined // cleanupOrphanedEdges returns undefined when no edges removed
            )
            // Verify no Else anchor
            const call = mockUpdateNodeData.mock.calls[0]
            expect(call[1].outputAnchors).toHaveLength(2)
        })

        it('should render MessagesInput for agentMessages param on Agent node', () => {
            const agentParams: InputParam[] = [
                {
                    name: 'agentMessages',
                    label: 'Messages',
                    type: 'array',
                    optional: true
                } as InputParam
            ]

            const agentData: NodeData = {
                id: 'agentAgentflow_0',
                name: 'agentAgentflow',
                label: 'Agent',
                inputValues: {
                    agentMessages: [{ role: 'system', content: 'You are helpful' }]
                }
            } as NodeData

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: agentParams, data: agentData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            expect(screen.getByTestId('messages-input-agentMessages')).toBeInTheDocument()
            // Should NOT render generic NodeInputHandler for the messages param
            expect(screen.queryByTestId('input-handler-agentMessages')).not.toBeInTheDocument()
        })

        it('should render MessagesInput for llmMessages param on LLM node', () => {
            const llmParams: InputParam[] = [
                {
                    name: 'llmMessages',
                    label: 'Messages',
                    type: 'array',
                    optional: true
                } as InputParam
            ]

            const llmData: NodeData = {
                id: 'llmAgentflow_0',
                name: 'llmAgentflow',
                label: 'LLM',
                inputValues: { llmMessages: [] }
            } as NodeData

            render(
                <EditNodeDialog show={true} dialogProps={{ inputParams: llmParams, data: llmData, disabled: false }} onCancel={jest.fn()} />
            )

            expect(screen.getByTestId('messages-input-llmMessages')).toBeInTheDocument()
            expect(screen.queryByTestId('input-handler-llmMessages')).not.toBeInTheDocument()
        })

        it('should propagate MessagesInput data changes through onCustomDataChange', () => {
            const agentParams: InputParam[] = [
                {
                    name: 'agentMessages',
                    label: 'Messages',
                    type: 'array',
                    optional: true
                } as InputParam
            ]

            const agentData: NodeData = {
                id: 'agentAgentflow_0',
                name: 'agentAgentflow',
                label: 'Agent',
                inputValues: { agentMessages: [{ role: 'system', content: 'Hello' }] }
            } as NodeData

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: agentParams, data: agentData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            fireEvent.click(screen.getByTestId('add-message-agentMessages'))

            expect(mockUpdateNodeData).toHaveBeenCalledWith('agentAgentflow_0', {
                inputValues: {
                    agentMessages: [
                        { role: 'system', content: 'Hello' },
                        { role: 'user', content: '' }
                    ]
                }
            })
        })

        it('should render StructuredOutputBuilder for agentStructuredOutput param', () => {
            const agentParams: InputParam[] = [
                {
                    name: 'agentStructuredOutput',
                    label: 'JSON Structured Output',
                    type: 'array',
                    optional: true
                } as InputParam
            ]

            const agentData: NodeData = {
                id: 'agentAgentflow_0',
                name: 'agentAgentflow',
                label: 'Agent',
                inputValues: {
                    agentStructuredOutput: [{ key: 'name', type: 'string', description: '' }]
                }
            } as NodeData

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: agentParams, data: agentData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            expect(screen.getByTestId('structured-output-agentStructuredOutput')).toBeInTheDocument()
            expect(screen.queryByTestId('input-handler-agentStructuredOutput')).not.toBeInTheDocument()
        })

        it('should render StructuredOutputBuilder for llmStructuredOutput param', () => {
            const llmParams: InputParam[] = [
                {
                    name: 'llmStructuredOutput',
                    label: 'JSON Structured Output',
                    type: 'array',
                    optional: true
                } as InputParam
            ]

            const llmData: NodeData = {
                id: 'llmAgentflow_0',
                name: 'llmAgentflow',
                label: 'LLM',
                inputValues: { llmStructuredOutput: [] }
            } as NodeData

            render(
                <EditNodeDialog show={true} dialogProps={{ inputParams: llmParams, data: llmData, disabled: false }} onCancel={jest.fn()} />
            )

            expect(screen.getByTestId('structured-output-llmStructuredOutput')).toBeInTheDocument()
            expect(screen.queryByTestId('input-handler-llmStructuredOutput')).not.toBeInTheDocument()
        })

        it('should propagate StructuredOutputBuilder data changes through onCustomDataChange', () => {
            const llmParams: InputParam[] = [
                {
                    name: 'llmStructuredOutput',
                    label: 'JSON Structured Output',
                    type: 'array',
                    optional: true
                } as InputParam
            ]

            const llmData: NodeData = {
                id: 'llmAgentflow_0',
                name: 'llmAgentflow',
                label: 'LLM',
                inputValues: { llmStructuredOutput: [{ key: 'name', type: 'string', description: '' }] }
            } as NodeData

            render(
                <EditNodeDialog show={true} dialogProps={{ inputParams: llmParams, data: llmData, disabled: false }} onCancel={jest.fn()} />
            )

            fireEvent.click(screen.getByTestId('add-output-llmStructuredOutput'))

            expect(mockUpdateNodeData).toHaveBeenCalledWith('llmAgentflow_0', {
                inputValues: {
                    llmStructuredOutput: [
                        { key: 'name', type: 'string', description: '' },
                        { key: '', type: 'string', description: '' }
                    ]
                }
            })
        })

        it('Start node: formInputTypes shows addOptions only when type is "options"', () => {
            const startInputParams = createStartNodeInputParams()
            const startData = createStartNodeData({
                startInputType: 'formInput',
                formTitle: 'My Form',
                formDescription: 'Fill it out',
                formInputTypes: [
                    { type: 'options', label: 'Color', name: 'color', addOptions: [{ option: 'Red' }] },
                    { type: 'string', label: 'Name', name: 'userName' }
                ]
            })

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: startInputParams, data: startData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            // formTitle, formDescription, and formInputTypes should all be visible
            expect(screen.getByTestId('input-handler-formTitle')).toBeInTheDocument()
            expect(screen.getByTestId('input-handler-formDescription')).toBeInTheDocument()
            expect(screen.getByTestId('input-handler-formInputTypes')).toBeInTheDocument()

            // itemParameters should be computed for formInputTypes (2 items)
            const handler = screen.getByTestId('input-handler-formInputTypes')
            expect(handler).toHaveAttribute('data-item-params-count', '2')
        })

        it('Start node: hides formTitle/formDescription/formInputTypes when chatInput is selected', () => {
            // Use the factory without array children — not needed for this visibility test
            const startInputParams = createStartNodeInputParams({ includeFormInputTypesArray: false })
            const startData = createStartNodeData({ startInputType: 'chatInput' })

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: startInputParams, data: startData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            // Form fields should be hidden when chatInput is selected
            expect(screen.queryByTestId('input-handler-formTitle')).not.toBeInTheDocument()
            expect(screen.queryByTestId('input-handler-formInputTypes')).not.toBeInTheDocument()
        })

        it('Start node: changing Type dropdown recomputes itemParameters dynamically', () => {
            // Start with two formInputTypes rows, both type=string (addOptions hidden for both)
            const startInputParams = createStartNodeInputParams()
            const startData = createStartNodeData({
                startInputType: 'formInput',
                formTitle: 'My Form',
                formDescription: '',
                formInputTypes: [
                    { type: 'string', label: 'Name', name: 'userName' },
                    { type: 'string', label: 'Age', name: 'age' }
                ]
            })

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{ inputParams: startInputParams, data: startData, disabled: false }}
                    onCancel={jest.fn()}
                />
            )

            // Verify initial itemParameters count is 2 (one per row)
            const handler = screen.getByTestId('input-handler-formInputTypes')
            expect(handler).toHaveAttribute('data-item-params-count', '2')

            // Simulate changing the first row's Type from "string" to "options"
            // This fires onCustomDataChange -> computeArrayItemParameters
            fireEvent.click(screen.getByTestId('set-type-options-formInputTypes-0'))

            // After the change, updateNodeData should have been called with the updated array
            expect(mockUpdateNodeData).toHaveBeenCalledWith('startAgentflow_0', {
                inputValues: expect.objectContaining({
                    formInputTypes: [
                        { type: 'options', label: 'Name', name: 'userName' },
                        { type: 'string', label: 'Age', name: 'age' }
                    ]
                })
            })

            // itemParameters should still have 2 entries (one per array item)
            // The recomputation happens via setArrayItemParameters in onCustomDataChange
            const updatedHandler = screen.getByTestId('input-handler-formInputTypes')
            expect(updatedHandler).toHaveAttribute('data-item-params-count', '2')
        })

        it('should compute and pass itemParameters to NodeInputHandler matching array item count', () => {
            const arrayParams: InputParam[] = [
                {
                    name: 'items',
                    label: 'Item',
                    type: 'array',
                    array: [
                        { id: 'type', name: 'type', label: 'Type', type: 'string' } as InputParam,
                        {
                            id: 'detail',
                            name: 'detail',
                            label: 'Detail',
                            type: 'string',
                            show: { 'items[$index].type': 'special' }
                        } as InputParam
                    ]
                } as InputParam
            ]

            const propsWithArrayData = {
                ...defaultProps,
                dialogProps: {
                    ...defaultProps.dialogProps,
                    inputParams: arrayParams,
                    data: {
                        ...nodeData,
                        inputValues: { items: [{ type: 'normal' }, { type: 'special' }] }
                    }
                }
            }

            render(<EditNodeDialog {...propsWithArrayData} />)

            // itemParameters should have one entry per array item (2 items → count = 2)
            const handler = screen.getByTestId('input-handler-items')
            expect(handler).toHaveAttribute('data-item-params-count', '2')
        })

        it('should not crash when a non-array field changes while array params exist', () => {
            const mixedParams: InputParam[] = [
                { name: 'title', label: 'Title', type: 'string' } as InputParam,
                {
                    name: 'items',
                    label: 'Items',
                    type: 'array',
                    array: [{ id: 'key', name: 'key', label: 'Key', type: 'string' } as InputParam]
                } as InputParam
            ]

            render(
                <EditNodeDialog
                    show={true}
                    dialogProps={{
                        inputParams: mixedParams,
                        data: { ...nodeData, inputValues: { title: 'hello', items: [{ key: 'a' }] } },
                        disabled: false
                    }}
                    onCancel={jest.fn()}
                />
            )

            // Changing the string field should not throw "items.map is not a function"
            expect(() => {
                fireEvent.click(screen.getByTestId('change-title'))
            }).not.toThrow()
        })
    })
})
