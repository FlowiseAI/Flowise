/**
 * AnswerAgent MCP Server Node
 *
 * This file implements an AnswerAgent MCP server node following the standard pattern described in MCP/README.md.
 *
 * Key features:
 * - Implements INode interface
 * - Sets tags = ['AAI'] for UI Answer tab integration
 * - Sets category = 'MCP Servers'
 * - Automatically uses user's API key from database (no manual credential setup required)
 * - Uses API_HOST environment variable for base URL
 * - Exposes available actions via mcpActions input
 * - Registers the node as module.exports = { nodeClass: AnswerAgent_MCP }
 *
 * For more details and template information, see MCP/README.md.
 * All comments and documentation must be in English.
 */
import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getNodeModulesPackagePath } from '../../../../src/utils'
import { MCPToolkit } from '../core'

class AnswerAgent_MCP implements INode {
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
    tags: string[]

    constructor() {
        this.label = 'AnswerAgent MCP'
        this.name = 'answerAgentMCP'
        this.version = 1.0
        this.type = 'AnswerAgent MCP Tool'
        this.icon = 'answerai-square-black.png'
        this.category = 'MCP Servers'
        this.tags = ['AAI']
        this.description = 'MCP server that integrates with AnswerAgent API • Zero configuration required'
        this.documentation = 'https://www.npmjs.com/package/@answerai/answeragent-mcp'
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

                const result = toolset.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))

                return result
            } catch (error) {
                console.error('DEBUG: Error in listActions:', error)
                return [
                    {
                        label: 'No Available Actions',
                        name: 'error',
                        description: 'No available actions, please check your configuration and refresh'
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
        // Get API host from environment variable
        const apiHost = options.user?.chatflowDomain
        if (!apiHost) {
            throw new Error('API_HOST environment variable is not set')
        }

        // Get user's API key from database
        const apiKey = await this.getUserApiKey(nodeData, options)
        if (!apiKey) {
            throw new Error('Unable to retrieve user API key from database')
        }

        // Get the package path for the AnswerAgent MCP server
        const packagePath = getNodeModulesPackagePath('@answerai/answeragent-mcp/dist/index.js')

        const serverParams = {
            command: process.execPath,
            args: [packagePath],
            env: {
                ANSWERAGENT_AI_API_HOST: apiHost,
                ANSWERAGENT_AI_API_TOKEN: apiKey
            }
        }

        const toolkit = new MCPToolkit(serverParams, 'stdio')

        await toolkit.initialize()

        const tools = toolkit.tools ?? []

        return tools
    }

    /**
     * Retrieve the user's API key from the database
     * This automatically uses the user's default API key, eliminating the need for manual credential setup
     */
    private async getUserApiKey(nodeData: INodeData, options: ICommonObject): Promise<string | null> {
        try {
            // Get database connection from options
            const appDataSource = options.appDataSource
            if (!appDataSource) {
                console.error('No database connection available')
                return null
            }

            // Get user ID - handle both contexts:
            // 1. Load method context: options.userId
            // 2. Workflow execution context: options.user.id
            const userId = options.userId || options.user?.id
            if (!userId) {
                console.error('No user ID available in options')
                return null
            }

            // Get organization ID - handle both contexts:
            // 1. Load method context: options.organizationId
            // 2. Workflow execution context: options.user.organizationId
            const organizationId = options.organizationId || options.user?.organizationId
            if (!organizationId) {
                console.error('No organization ID available')
                return null
            }

            // Fallback to ApiKey table
            const databaseEntities = options.databaseEntities
            if (!databaseEntities || !databaseEntities['ApiKey']) {
                console.error('ApiKey entity not available in databaseEntities')
                return null
            }

            // Query the database for the user's API keys using the entity from databaseEntities

            const apiKeys = await appDataSource.getRepository(databaseEntities['ApiKey']).find({
                where: {
                    userId: userId,
                    organizationId: organizationId,
                    isActive: true
                },
                order: {
                    updatedDate: 'DESC' // Get the most recently updated key
                }
            })

            if (apiKeys.length === 0) {
                console.error('No active API keys found for user')
                return null
            }

            // Return the first (most recent) API key
            const selectedApiKey = apiKeys[0].apiKey

            return selectedApiKey
        } catch (error) {
            console.error('Error retrieving user API key:', error)
            return null
        }
    }
}

module.exports = { nodeClass: AnswerAgent_MCP }
