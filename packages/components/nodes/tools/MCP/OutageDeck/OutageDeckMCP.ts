import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { MCPToolkit } from '../core'

const OUTAGEDECK_MCP_URL = 'https://outagedeck.com/api/mcp'
const PUBLIC_TOOL_NAMES = new Set([
    'get_provider_status',
    'check_my_stack',
    'list_active_incidents',
    'get_incident_details',
    'get_uptime',
    'get_outage_report',
    'search_providers',
    'search',
    'fetch'
])

class OutageDeck_MCP implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    documentation: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'OutageDeck MCP'
        this.name = 'outageDeckMCP'
        this.version = 1.0
        this.type = 'OutageDeck MCP Tool'
        this.icon = 'outagedeck.svg'
        this.category = 'Tools (MCP)'
        this.description = 'Keyless, read-only cloud and SaaS status, incident timelines, and observed uptime history from vendor-published feeds'
        this.documentation = 'https://outagedeck.com/developers/mcp?utm_source=flowise&utm_medium=integration&utm_campaign=flowise_mcp'
        this.inputs = [
            {
                label: 'Available Actions',
                name: 'mcpActions',
                type: 'asyncMultiOptions',
                loadMethod: 'listActions',
                refresh: true
            }
        ]
        this.baseClasses = ['Tool']
    }

    loadMethods = {
        listActions: async (nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                const toolset = await this.getTools(nodeData, options ?? {})
                toolset.sort((a: Tool, b: Tool) => a.name.localeCompare(b.name))

                return toolset.map(({ name, description }) => ({
                    label: name.toUpperCase(),
                    name,
                    description: description || name
                }))
            } catch (error) {
                console.error('Error listing OutageDeck actions:', error)
                return [
                    {
                        label: 'No Available Actions',
                        name: 'error',
                        description: 'OutageDeck could not be reached. Refresh to retry.'
                    }
                ]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<Tool[]> {
        const tools = await this.getTools(nodeData, options)
        const selectedActions = nodeData.inputs?.mcpActions
        let mcpActions: string[] = []

        if (selectedActions) {
            try {
                mcpActions = typeof selectedActions === 'string' ? JSON.parse(selectedActions) : selectedActions
            } catch (error) {
                console.error('Error parsing OutageDeck MCP actions:', error)
            }
        }

        return tools.filter((tool: Tool) => mcpActions.includes(tool.name))
    }

    async getTools(_: INodeData, __: ICommonObject): Promise<Tool[]> {
        const serverParams = {
            type: 'http',
            url: OUTAGEDECK_MCP_URL
        }
        const toolkit = new MCPToolkit(serverParams, 'http')
        await toolkit.initialize()

        return (toolkit.tools ?? []).filter((tool: Tool) => PUBLIC_TOOL_NAMES.has(tool.name)) as Tool[]
    }
}

module.exports = { nodeClass: OutageDeck_MCP }
