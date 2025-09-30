/**
 * Atlassian Remote MCP Server Node
 *
 * This file implements an Atlassian MCP server node that uses a custom remote MCP server
 * with OAuth 2.0 bearer token authentication.
 *
 * Key features:
 * - Uses atlassianOAuth credential with access_token, refresh_token, expiration_time
 * - Handles token refresh automatically before MCP initialization
 * - Connects to Atlassian's remote MCP server via SSE transport
 * - Supports both JIRA and Confluence through single integration
 *
 * Required environment variables:
 * - ATLASSIAN_CLIENT_ID
 * - ATLASSIAN_CLIENT_SECRET
 *
 * For more details and a template, see MCP/README.md.
 * All comments and documentation must be in English.
 */
import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { MCPToolkit } from '../core'
import { getCredentialData } from '../../../../src/utils'

class Atlassian_MCP implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    documentation: string
    credential: INodeParams
    inputs: INodeParams[]
    tags: string[]
    requiresOAuthRefresh: boolean

    constructor() {
        this.label = 'Atlassian MCP'
        this.name = 'atlassianMcp'
        this.version = 1.0
        this.type = 'Atlassian MCP Tool'
        this.icon = 'atlassian.svg'
        this.category = 'MCP Servers'
        this.tags = ['AAI']
        this.description = 'MCP server that integrates with Atlassian JIRA and Confluence using OAuth authentication'
        this.documentation = 'https://support.atlassian.com/rovo/docs/getting-started-with-the-atlassian-remote-mcp-server/'
        this.requiresOAuthRefresh = true
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['atlassianOAuth']
        }
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

    //@ts-ignore
    loadMethods = {
        listActions: async (nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                // Check if credential exists first
                if (!nodeData.credential) {
                    return [
                        {
                            label: 'No Credential Selected',
                            name: 'no_credential',
                            description: 'Please select an Atlassian OAuth credential first'
                        }
                    ]
                }

                const toolset = await this.getTools(nodeData, options)
                toolset.sort((a, b) => a.name.localeCompare(b.name))

                return toolset.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))
            } catch (error) {
                console.error('Error loading Atlassian MCP actions:', error)
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                return [
                    {
                        label: 'Error Loading Actions',
                        name: 'error',
                        description: `Failed to load actions: ${errorMessage}. Please check your OAuth credential setup.`
                    }
                ]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<Tool[]> {
        const tools = await this.getTools(nodeData, options)

        const _mcpActions = nodeData.inputs?.mcpActions
        let mcpActions = []
        if (_mcpActions) {
            try {
                mcpActions = typeof _mcpActions === 'string' ? JSON.parse(_mcpActions) : _mcpActions
            } catch (error) {
                console.error('Error parsing mcp actions:', error)
            }
        }

        return tools.filter((tool) => mcpActions.includes(tool.name))
    }

    async getTools(nodeData: INodeData, options: ICommonObject): Promise<Tool[]> {
        // Token refresh is handled automatically by server before node initialization
        // So we can directly use the access token from credential data
        const credentialData = await getCredentialData(nodeData.credential || '', options)

        if (!credentialData.access_token) {
            console.error('Atlassian MCP: Access token not found in credential data')
            return []
        }

        if (!process.env.ATLASSIAN_MCP_SERVER_URL) {
            console.error('ATLASSIAN_MCP_SERVER_URL environment variable is not set')
            return []
        }

        const serverParams = {
            url: `${process.env.ATLASSIAN_MCP_SERVER_URL}/sse`
        }

        const toolkit = new MCPToolkit(serverParams, 'sse', credentialData.access_token)
        await toolkit.initialize()

        const tools = toolkit.tools ?? []

        return tools
    }
}

module.exports = { nodeClass: Atlassian_MCP }
