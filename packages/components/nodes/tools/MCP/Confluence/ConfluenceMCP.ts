/**
 * MCP Server Node Pattern Example
 *
 * This file implements a Confluence MCP server node following the standard pattern described in MCP/README.md.
 *
 * Key requirements:
 * - Implements INode interface
 * - Sets tags = ['AAI'] for UI Answer tab integration
 * - Sets category = 'MCP Servers'
 * - Exposes available actions via mcpActions input
 * - Registers the node as module.exports = { nodeClass: Confluence_MCP }
 *
 * For more details and a template, see MCP/README.md.
 * All comments and documentation must be in English.
 */
import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam, getNodeModulesPackagePath } from '../../../../src/utils'
import { MCPToolkit } from '../core'

class Confluence_MCP implements INode {
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
        this.label = 'Confluence MCP'
        this.name = 'confluenceMCP'
        this.version = 1.0
        this.type = 'Confluence MCP Tool'
        this.icon = 'confluence.svg'
        this.category = 'MCP Servers'
        this.tags = ['AAI']
        this.description = 'MCP server that integrates the Confluence API'
        this.documentation = 'https://github.com/modelcontextprotocol/servers/tree/main/src/jira'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['confluenceCloudApi']
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
                return [
                    {
                        label: 'No Available Actions',
                        name: 'error',
                        description: 'No available actions, please check your API key and refresh'
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
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const confluenceApiKey = getCredentialParam('accessToken', credentialData, nodeData)
        const confluenceApiEmail = getCredentialParam('username', credentialData, nodeData)
        const confluenceUrl = getCredentialParam('baseURL', credentialData, nodeData)
        const packagePath = getNodeModulesPackagePath('@answerai/confluence-mcp/build/index.js')
        const serverParams = {
            command: process.execPath,
            args: [packagePath],
            env: {
                CONFLUENCE_API_TOKEN: confluenceApiKey,
                CONFLUENCE_USER_EMAIL: confluenceApiEmail,
                CONFLUENCE_BASE_URL: confluenceUrl
            }
        }

        const toolkit = new MCPToolkit(serverParams, 'stdio')
        await toolkit.initialize()

        const tools = toolkit.tools ?? []

        return tools
    }
}

module.exports = { nodeClass: Confluence_MCP }
