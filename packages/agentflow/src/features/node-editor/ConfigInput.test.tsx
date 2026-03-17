import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { ConfigInput } from './ConfigInput'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@tabler/icons-react', () => ({
    IconArrowsMaximize: () => <span data-testid='icon-expand' />,
    IconVariable: () => <span data-testid='icon-variable' />,
    IconRefresh: () => <span data-testid='icon-refresh' />,
    IconSettings: () => <span data-testid='icon-settings' />
}))

jest.mock('@mui/icons-material/ExpandMore', () => ({
    __esModule: true,
    default: () => <span data-testid='expand-more-icon' />
}))

const mockGetNodeByName = jest.fn()

jest.mock('@/infrastructure/store', () => ({
    useApiContext: () => ({
        nodesApi: { getNodeByName: mockGetNodeByName }
    }),
    useAgentflowContext: () => ({
        updateNodeData: jest.fn(),
        state: { nodes: [], edges: [] }
    }),
    useConfigContext: () => ({ isDarkMode: false })
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockOnConfigChange = jest.fn()

const makeParentData = (overrides?: Partial<NodeData>): NodeData => ({
    id: 'agent-node-1',
    name: 'agentAgentflow',
    label: 'Agent 0',
    inputValues: { agentModel: 'chatAlibabaTongyi' },
    ...overrides
})

const makeInputParam = (overrides?: Partial<InputParam>): InputParam => ({
    id: 'p1',
    name: 'agentModel',
    label: 'Model',
    type: 'asyncOptions',
    loadConfig: true,
    ...overrides
})

/** Fake node definition returned by getNodeByName */
const fakeNodeDefinition: NodeData = {
    id: '',
    name: 'chatAlibabaTongyi',
    label: 'ChatAlibabaTongyi',
    inputs: [
        { id: 'i1', name: 'chatAlibabaTongyi', label: 'Model Name', type: 'asyncOptions' } as InputParam,
        { id: 'i2', name: 'temperature', label: 'Temperature', type: 'number', default: 0.9 } as InputParam,
        { id: 'i3', name: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1024 } as InputParam
    ]
}

beforeEach(() => {
    jest.clearAllMocks()
    mockGetNodeByName.mockResolvedValue(fakeNodeDefinition)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConfigInput', () => {
    describe('rendering', () => {
        it('renders accordion with model label after loading', async () => {
            render(<ConfigInput data={makeParentData()} inputParam={makeInputParam()} onConfigChange={mockOnConfigChange} />)

            await waitFor(() => {
                expect(screen.getByText('ChatAlibabaTongyi Parameters')).toBeTruthy()
            })
        })

        it('renders nothing when no model is selected', () => {
            const { container } = render(
                <ConfigInput
                    data={makeParentData({ inputValues: { agentModel: '' } })}
                    inputParam={makeInputParam()}
                    onConfigChange={mockOnConfigChange}
                />
            )

            // No accordion should render
            expect(container.querySelector('.MuiAccordion-root')).toBeNull()
        })

        it('calls getNodeByName with the selected model name', async () => {
            render(<ConfigInput data={makeParentData()} inputParam={makeInputParam()} onConfigChange={mockOnConfigChange} />)

            await waitFor(() => {
                expect(mockGetNodeByName).toHaveBeenCalledWith('chatAlibabaTongyi')
            })
        })

        it('renders parameter fields inside accordion details', async () => {
            render(<ConfigInput data={makeParentData()} inputParam={makeInputParam()} onConfigChange={mockOnConfigChange} />)

            await waitFor(() => {
                expect(screen.getByText('Temperature')).toBeTruthy()
                expect(screen.getByText('Max Tokens')).toBeTruthy()
            })
        })
    })

    describe('config persistence', () => {
        it('calls onConfigChange with config values after loading', async () => {
            render(<ConfigInput data={makeParentData()} inputParam={makeInputParam()} onConfigChange={mockOnConfigChange} />)

            await waitFor(() => {
                expect(mockOnConfigChange).toHaveBeenCalledWith(
                    'agentModelConfig',
                    expect.objectContaining({
                        agentModel: 'chatAlibabaTongyi',
                        temperature: 0.9,
                        maxTokens: 1024
                    }),
                    undefined
                )
            })
        })

        it('calls onConfigChange with array context when arrayIndex is provided', async () => {
            const parentArray: InputParam = {
                id: 'arr',
                name: 'agentTools',
                label: 'Tools',
                type: 'array'
            }

            const parentData = makeParentData({
                inputValues: {
                    agentTools: [{ agentSelectedTool: 'requestsGet' }]
                }
            })

            const param = makeInputParam({
                name: 'agentSelectedTool',
                label: 'Tool'
            })

            render(
                <ConfigInput
                    data={parentData}
                    inputParam={param}
                    arrayIndex={0}
                    parentArrayParam={parentArray}
                    onConfigChange={mockOnConfigChange}
                />
            )

            await waitFor(() => {
                expect(mockGetNodeByName).toHaveBeenCalledWith('requestsGet')
                expect(mockOnConfigChange).toHaveBeenCalledWith('agentSelectedToolConfig', expect.any(Object), {
                    parentParamName: 'agentTools',
                    arrayIndex: 0
                })
            })
        })
    })

    describe('existing config merge', () => {
        it('reuses existing config when model matches', async () => {
            const parentData = makeParentData({
                inputValues: {
                    agentModel: 'chatAlibabaTongyi',
                    agentModelConfig: {
                        agentModel: 'chatAlibabaTongyi',
                        temperature: 0.5,
                        maxTokens: 2048
                    }
                }
            })

            render(<ConfigInput data={parentData} inputParam={makeInputParam()} onConfigChange={mockOnConfigChange} />)

            await waitFor(() => {
                // Should call with the EXISTING config values (0.5, 2048), not defaults (0.9, 1024)
                expect(mockOnConfigChange).toHaveBeenCalledWith(
                    'agentModelConfig',
                    expect.objectContaining({
                        temperature: 0.5,
                        maxTokens: 2048
                    }),
                    undefined
                )
            })
        })

        it('resets to defaults when stored config model does not match current selection', async () => {
            const parentData = makeParentData({
                inputValues: {
                    agentModel: 'chatAlibabaTongyi',
                    agentModelConfig: {
                        agentModel: 'chatOpenAI', // Different model — stale config
                        temperature: 0.3,
                        maxTokens: 4096
                    }
                }
            })

            render(<ConfigInput data={parentData} inputParam={makeInputParam()} onConfigChange={mockOnConfigChange} />)

            await waitFor(() => {
                // Should reset to defaults from initNode, NOT use the stale config
                expect(mockOnConfigChange).toHaveBeenCalledWith(
                    'agentModelConfig',
                    expect.objectContaining({
                        agentModel: 'chatAlibabaTongyi',
                        temperature: 0.9,
                        maxTokens: 1024
                    }),
                    undefined
                )
            })
        })
    })

    describe('internal changes', () => {
        it('updates config when a parameter value changes', async () => {
            render(<ConfigInput data={makeParentData()} inputParam={makeInputParam()} onConfigChange={mockOnConfigChange} />)

            // Wait for accordion to load
            await waitFor(() => {
                expect(screen.getByText('Temperature')).toBeTruthy()
            })

            // Expand the accordion
            fireEvent.click(screen.getByText('ChatAlibabaTongyi Parameters'))

            // Find and change the temperature field
            const temperatureInputs = screen.getAllByRole('spinbutton')
            const tempInput = temperatureInputs[0]
            fireEvent.change(tempInput, { target: { value: '0.7' } })

            await waitFor(() => {
                expect(mockOnConfigChange).toHaveBeenCalledWith(
                    'agentModelConfig',
                    expect.objectContaining({ temperature: '0.7' }),
                    undefined
                )
            })
        })
    })

    describe('API error handling', () => {
        it('renders nothing when API call fails', async () => {
            mockGetNodeByName.mockRejectedValue(new Error('Not found'))

            const { container } = render(
                <ConfigInput data={makeParentData()} inputParam={makeInputParam()} onConfigChange={mockOnConfigChange} />
            )

            // Wait a tick for the async effect to settle
            await waitFor(() => {
                expect(mockGetNodeByName).toHaveBeenCalled()
            })

            expect(container.querySelector('.MuiAccordion-root')).toBeNull()
        })
    })

    describe('field visibility', () => {
        it('hides params based on show/hide conditions', async () => {
            const nodeDefnWithVisibility: NodeData = {
                id: '',
                name: 'chatAlibabaTongyi',
                label: 'ChatAlibabaTongyi',
                inputs: [
                    { id: 'i1', name: 'chatAlibabaTongyi', label: 'Model Name', type: 'asyncOptions' } as InputParam,
                    { id: 'i2', name: 'temperature', label: 'Temperature', type: 'number', default: 0.9 } as InputParam,
                    {
                        id: 'i3',
                        name: 'advancedParam',
                        label: 'Advanced Param',
                        type: 'string',
                        show: { temperature: 999 } // Only show when temperature is 999 — effectively hidden
                    } as InputParam
                ]
            }

            mockGetNodeByName.mockResolvedValue(nodeDefnWithVisibility)

            render(<ConfigInput data={makeParentData()} inputParam={makeInputParam()} onConfigChange={mockOnConfigChange} />)

            await waitFor(() => {
                expect(screen.getByText('Temperature')).toBeTruthy()
            })

            // advancedParam should NOT be visible (its show condition is not met)
            expect(screen.queryByText('Advanced Param')).toBeNull()
        })
    })
})
