import { makeNodeData } from '@test-utils/factories'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { NodeInfoDialog, type NodeInfoDialogProps } from './NodeInfoDialog'

// --- Mocks ---
const mockGetNodeConfig = jest.fn()
const mockGetNodeByName = jest.fn()

jest.mock('@/infrastructure/store', () => ({
    useApiContext: () => ({
        nodesApi: { getNodeConfig: mockGetNodeConfig, getNodeByName: mockGetNodeByName },
        apiBaseUrl: 'http://localhost:3000'
    })
}))

jest.mock('../nodeIcons', () => ({
    renderNodeIcon: () => <span data-testid='node-icon'>icon</span>
}))

const baseData = makeNodeData({
    id: 'node-1',
    name: 'llmAgentflow',
    label: 'LLM',
    description: 'A large language model node',
    color: '#45B7D1',
    version: 2
})

async function renderDialog(overrides?: Partial<NodeInfoDialogProps>) {
    const props: NodeInfoDialogProps = {
        open: true,
        onClose: jest.fn(),
        data: baseData,
        ...overrides
    }
    const result = render(<NodeInfoDialog {...props} />)
    // Wait for the async fetch effects to settle (getNodeByName is called first, then getNodeConfig)
    await waitFor(() => {
        expect(mockGetNodeByName).toHaveBeenCalled()
    })
    return result
}

describe('NodeInfoDialog', () => {
    beforeEach(() => {
        mockGetNodeConfig.mockResolvedValue([])
        mockGetNodeByName.mockResolvedValue({})
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should render node label in the title', async () => {
        await renderDialog()
        expect(screen.getByText('LLM')).toBeInTheDocument()
    })

    it('should render the node ID badge', async () => {
        await renderDialog()
        expect(screen.getByText('node-1')).toBeInTheDocument()
    })

    it('should render version badge', async () => {
        await renderDialog()
        expect(screen.getByText('version 2')).toBeInTheDocument()
    })

    it('should render description', async () => {
        await renderDialog()
        expect(screen.getByText('A large language model node')).toBeInTheDocument()
    })

    it('should render node icon for colored nodes', async () => {
        await renderDialog()
        expect(screen.getByTestId('node-icon')).toBeInTheDocument()
    })

    it('should render image icon when no color but has icon', async () => {
        const data = makeNodeData({
            id: 'node-2',
            name: 'customNode',
            label: 'Custom',
            color: undefined,
            icon: 'some-icon.png'
        })
        await renderDialog({ data })
        const img = screen.getByRole('img')
        expect(img).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/customNode')
    })

    it('should render badge when present', async () => {
        const data = makeNodeData({
            id: 'node-3',
            name: 'oldNode',
            label: 'Old Node',
            badge: 'DEPRECATING'
        })
        await renderDialog({ data })
        expect(screen.getByText('DEPRECATING')).toBeInTheDocument()
    })

    it('should render tags when present', async () => {
        const data = makeNodeData({
            id: 'node-4',
            name: 'taggedNode',
            label: 'Tagged Node',
            tags: ['AGENT', 'LLM']
        })
        await renderDialog({ data })
        expect(screen.getByText('agent')).toBeInTheDocument()
        expect(screen.getByText('llm')).toBeInTheDocument()
    })

    it('should render documentation button when documentation URL exists', async () => {
        const data = makeNodeData({
            id: 'node-5',
            name: 'docNode',
            label: 'Doc Node',
            documentation: 'https://docs.example.com/node'
        })
        await renderDialog({ data })
        expect(screen.getByRole('button', { name: /documentation/i })).toBeInTheDocument()
    })

    it('should not render documentation button when no URL', async () => {
        await renderDialog()
        expect(screen.queryByRole('button', { name: /documentation/i })).not.toBeInTheDocument()
    })

    it('should render schema info icon when config entry has schema', async () => {
        mockGetNodeConfig.mockResolvedValue([
            {
                node: 'Start',
                nodeId: 'node-1',
                label: 'Form Input Types',
                name: 'formInputTypes',
                type: 'array',
                schema: { type: 'string', label: 'string' }
            }
        ])

        const props: NodeInfoDialogProps = { open: true, onClose: jest.fn(), data: baseData }
        render(<NodeInfoDialog {...props} />)

        await waitFor(() => {
            expect(screen.getByText('array')).toBeInTheDocument()
        })
        // Info icon should be rendered next to the type
        expect(document.querySelector('[data-testid="InfoIcon"]')).toBeInTheDocument()
    })

    it('should show object schema content in tooltip when hovering info icon', async () => {
        const user = userEvent.setup()
        mockGetNodeConfig.mockResolvedValue([
            {
                node: 'Start',
                nodeId: 'node-1',
                label: 'Form Input Types',
                name: 'formInputTypes',
                type: 'array',
                schema: { type: 'string', label: 'string' }
            }
        ])

        const props: NodeInfoDialogProps = { open: true, onClose: jest.fn(), data: baseData }
        render(<NodeInfoDialog {...props} />)

        await waitFor(() => {
            expect(screen.getByText('array')).toBeInTheDocument()
        })

        const infoButton = document.querySelector('[data-testid="InfoIcon"]')!.closest('button')!
        await user.hover(infoButton)

        await waitFor(() => {
            expect(screen.getByText('Schema:')).toBeInTheDocument()
        })
    })

    it('should show array schema content in tooltip when hovering info icon', async () => {
        const user = userEvent.setup()
        mockGetNodeConfig.mockResolvedValue([
            {
                node: 'Start',
                nodeId: 'node-1',
                label: 'Items',
                name: 'items',
                type: 'array',
                schema: [
                    { name: 'key', type: 'string' },
                    { name: 'value', type: 'number' }
                ]
            }
        ])

        const props: NodeInfoDialogProps = { open: true, onClose: jest.fn(), data: baseData }
        render(<NodeInfoDialog {...props} />)

        await waitFor(() => {
            expect(screen.getByText('array')).toBeInTheDocument()
        })

        const infoButton = document.querySelector('[data-testid="InfoIcon"]')!.closest('button')!
        await user.hover(infoButton)

        await waitFor(() => {
            expect(screen.getByText('Schema:')).toBeInTheDocument()
            expect(screen.getByText(/"key"/)).toBeInTheDocument()
        })
    })

    it('should open documentation link in new tab when button is clicked', async () => {
        const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
        const data = makeNodeData({
            id: 'node-doc',
            name: 'docNode',
            label: 'Doc Node',
            documentation: 'https://docs.example.com/node'
        })
        await renderDialog({ data })
        screen.getByRole('button', { name: /documentation/i }).click()
        expect(openSpy).toHaveBeenCalledWith('https://docs.example.com/node', '_blank', 'noopener,noreferrer')
        openSpy.mockRestore()
    })

    it('should fetch and display node config table', async () => {
        mockGetNodeConfig.mockResolvedValue([
            { node: 'LLM', nodeId: 'node-1', label: 'Model Name', name: 'modelName', type: 'string' },
            { node: 'LLM', nodeId: 'node-1', label: 'Temperature', name: 'temperature', type: 'number' }
        ])

        const props: NodeInfoDialogProps = {
            open: true,
            onClose: jest.fn(),
            data: baseData
        }
        render(<NodeInfoDialog {...props} />)

        await waitFor(() => {
            expect(screen.getByText('Model Name')).toBeInTheDocument()
            expect(screen.getByText('Temperature')).toBeInTheDocument()
            expect(screen.getByText('string')).toBeInTheDocument()
            expect(screen.getByText('number')).toBeInTheDocument()
        })
    })

    it('should display Override column header with tooltip icon when config has enabled field', async () => {
        mockGetNodeConfig.mockResolvedValue([
            { node: 'LLM', nodeId: 'node-1', label: 'Model Name', name: 'modelName', type: 'string', enabled: true }
        ])

        const props: NodeInfoDialogProps = {
            open: true,
            onClose: jest.fn(),
            data: baseData
        }
        render(<NodeInfoDialog {...props} />)

        await waitFor(() => {
            expect(screen.getByText('Override')).toBeInTheDocument()
        })
    })

    it('should handle API failures gracefully', async () => {
        mockGetNodeByName.mockRejectedValue(new Error('Network error'))

        const props: NodeInfoDialogProps = {
            open: true,
            onClose: jest.fn(),
            data: baseData
        }
        render(<NodeInfoDialog {...props} />)

        // Should still render dialog without crashing
        await waitFor(() => {
            expect(mockGetNodeByName).toHaveBeenCalled()
        })
        expect(screen.getByText('LLM')).toBeInTheDocument()
    })

    it('should not render when dialog is closed', () => {
        mockGetNodeConfig.mockResolvedValue([])
        const props: NodeInfoDialogProps = {
            open: false,
            onClose: jest.fn(),
            data: baseData
        }
        const { container } = render(<NodeInfoDialog {...props} />)
        // MUI Dialog hides content when open=false — getNodeConfig should not be called
        expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
    })

    it('should call onClose when dialog is dismissed', async () => {
        const onClose = jest.fn()
        await renderDialog({ onClose })
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    describe('component definition fallback', () => {
        it('should use component definition for missing metadata fields', async () => {
            // Node data has no description, version, badge, tags, documentation
            const minimalData = makeNodeData({
                id: 'node-minimal',
                name: 'startAgentflow',
                label: 'Start',
                color: '#7EE787'
            })

            // Component definition provides the missing metadata
            mockGetNodeByName.mockResolvedValue({
                name: 'startAgentflow',
                label: 'Start',
                description: 'Starting point of the agentflow',
                version: 1.1,
                badge: 'NEW',
                tags: ['CORE'],
                documentation: 'https://docs.example.com/start'
            })

            const props: NodeInfoDialogProps = {
                open: true,
                onClose: jest.fn(),
                data: minimalData
            }
            render(<NodeInfoDialog {...props} />)

            await waitFor(() => {
                expect(screen.getByText('Starting point of the agentflow')).toBeInTheDocument()
            })
            expect(screen.getByText('version 1.1')).toBeInTheDocument()
            expect(screen.getByText('NEW')).toBeInTheDocument()
            expect(screen.getByText('core')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /documentation/i })).toBeInTheDocument()
        })

        it('should prefer node data over component definition', async () => {
            // Node data has description set
            const dataWithDesc = makeNodeData({
                id: 'node-desc',
                name: 'llmAgentflow',
                label: 'LLM',
                description: 'User-customized description',
                version: 3
            })

            // Component definition has different values
            mockGetNodeByName.mockResolvedValue({
                name: 'llmAgentflow',
                description: 'Default LLM description',
                version: 2
            })

            const props: NodeInfoDialogProps = {
                open: true,
                onClose: jest.fn(),
                data: dataWithDesc
            }
            render(<NodeInfoDialog {...props} />)

            await waitFor(() => {
                expect(screen.getByText('User-customized description')).toBeInTheDocument()
            })
            expect(screen.getByText('version 3')).toBeInTheDocument()
        })
    })
})
