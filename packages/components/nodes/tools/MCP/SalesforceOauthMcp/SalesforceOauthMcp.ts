/**
 * Salesforce OAuth MCP Server Node
 *
 * This file implements a Salesforce MCP server node that uses OAuth authentication
 * instead of client credentials. It uses the salesforceOAuth credential type which
 * contains only a refresh token, combined with environment variables for client
 * credentials and instance URL.
 *
 * Key differences from SfdcMCP:
 * - Uses salesforceOAuth credential (refresh token only)
 * - Uses OAuth_2.0_Personal connection type
 * - Points to local MCP server for development
 * - Gets CLIENT_ID, CLIENT_SECRET, INSTANCE_URL from environment
 *
 * Required environment variables:
 * - SALESFORCE_CLIENT_ID
 * - SALESFORCE_CLIENT_SECRET
 * - SALESFORCE_INSTANCE_URL
 *
 * For more details and a template, see MCP/README.md.
 * All comments and documentation must be in English.
 */
import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam, getNodeModulesPackagePath } from '../../../../src/utils'
import { MCPToolkit } from '../core'

class SalesforceOauth_MCP implements INode {
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

    constructor() {
        this.label = 'Salesforce OAuth MCP'
        this.name = 'salesforceOauthMcp'
        this.version = 1.0
        this.type = 'Salesforce OAuth MCP Tool'
        this.icon = 'salesforce.png'
        this.category = 'MCP Servers'
        this.tags = ['AAI']
        this.description = 'MCP server that integrates the Salesforce API using OAuth authentication'
        this.documentation = 'https://github.com/tsmztech/mcp-server-salesforce'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['salesforceOAuth']
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
                const toolset = await this.getTools(nodeData, options)
                toolset.sort((a, b) => a.name.localeCompare(b.name))

                return toolset.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))
            } catch (error) {
                console.error('Error loading Salesforce OAuth MCP actions:', error)
                return [
                    {
                        label: 'No Available Actions',
                        name: 'error',
                        description: 'No available actions, please check your OAuth credential and environment variables'
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
        // Get the refresh token from the OAuth credential
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const refreshToken = getCredentialParam('refreshToken', credentialData, nodeData)

        // Validate refresh token
        if (!refreshToken) {
            console.error('Salesforce OAuth MCP: Refresh token is required for Salesforce OAuth MCP')
            return []
        }

        // Get environment variables for OAuth configuration
        const salesforceClientId = process.env.SALESFORCE_CLIENT_ID
        const salesforceClientSecret = process.env.SALESFORCE_CLIENT_SECRET
        const salesforceInstanceUrl = process.env.SALESFORCE_INSTANCE_URL

        // Validate environment variables
        if (!salesforceClientId || !salesforceClientSecret || !salesforceInstanceUrl) {
            console.error(
                'Salesforce OAuth MCP: Missing required environment variables: SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, SALESFORCE_INSTANCE_URL'
            )
            return []
        }

        const packagePath = getNodeModulesPackagePath('@answerai/salesforce-mcp/dist/index.js')

        const serverParams = {
            command: process.execPath,
            args: [packagePath],
            env: {
                SALESFORCE_CONNECTION_TYPE: 'OAuth_2.0_Personal',
                SALESFORCE_CLIENT_ID: salesforceClientId,
                SALESFORCE_CLIENT_SECRET: salesforceClientSecret,
                SALESFORCE_INSTANCE_URL: salesforceInstanceUrl,
                SALESFORCE_REFRESH_TOKEN: refreshToken
            }
        }

        const toolkit = new MCPToolkit(serverParams, 'stdio')
        await toolkit.initialize()

        const tools = toolkit.tools ?? []

        return tools
    }
}

module.exports = { nodeClass: SalesforceOauth_MCP }
