import { INodeData } from '../../../../src/Interface'

const mockInitialize = jest.fn()
const mockTools = [
    { name: 'get_provider_status', description: 'Get provider status' },
    { name: 'search', description: 'Search OutageDeck' },
    { name: 'create_alert', description: 'Create an account alert' }
]

jest.mock('../core', () => ({
    MCPToolkit: jest.fn().mockImplementation(() => ({
        initialize: mockInitialize,
        tools: mockTools
    }))
}))

const { nodeClass: OutageDeck_MCP } = require('./OutageDeckMCP')

function createNodeData(mcpActions?: string | string[]): INodeData {
    return {
        id: 'outagedeck-test',
        label: 'OutageDeck MCP',
        name: 'outageDeckMCP',
        type: 'OutageDeckMCP',
        icon: 'outagedeck.svg',
        version: 1.0,
        category: 'Tools (MCP)',
        baseClasses: ['Tool'],
        inputs: { mcpActions }
    }
}

describe('OutageDeck MCP', () => {
    beforeEach(() => {
        mockInitialize.mockClear()
    })

    it('lists only public read-only actions', async () => {
        const node = new OutageDeck_MCP()

        const actions = await node.loadMethods.listActions(createNodeData(), {})

        expect(actions.map((action: { name: string }) => action.name)).toEqual(['get_provider_status', 'search'])
        expect(mockInitialize).toHaveBeenCalledTimes(1)
    })

    it('returns only the selected public actions', async () => {
        const node = new OutageDeck_MCP()

        const tools = await node.init(createNodeData(JSON.stringify(['search', 'create_alert'])), '', {})

        expect(tools.map((tool: { name: string }) => tool.name)).toEqual(['search'])
    })

    it('declares a keyless remote MCP component', () => {
        const node = new OutageDeck_MCP()

        expect(node.credential).toBeUndefined()
        expect(node.documentation).toContain('utm_campaign=flowise_mcp')
        expect(node.description).toContain('read-only')
    })
})
