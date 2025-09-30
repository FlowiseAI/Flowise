/**
 * MCP Server Node Pattern Example
 *
 * This file implements a Contentful MCP server node following the standard pattern described in MCP/README.md.
 *
 * Key requirements:
 * - Implements INode interface
 * - Sets tags = ['AAI'] for UI Answer tab integration
 * - Sets category = 'MCP Servers'
 * - Exposes available actions via mcpActions input
 * - Registers the node as module.exports = { nodeClass: Contentful_MCP }
 *
 * For more details and a template, see MCP/README.md.
 * All comments and documentation must be in English.
 */
import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam, getNodeModulesPackagePath } from '../../../../src/utils'
import { MCPToolkit } from '../core'

class Contentful_MCP implements INode {
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
        this.label = 'Contentful MCP'
        this.name = 'contentfulMCP'
        this.version = 1.0
        this.type = 'Contentful MCP Tool'
        this.icon = 'contentful.svg'
        this.category = 'MCP Servers'
        this.tags = ['AAI']
        this.description = 'MCP Server for the Contentful API'
        this.documentation = 'https://github.com/modelcontextprotocol/servers/tree/main/src/contentful'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['contentfulManagementApi']
        }
        this.inputs = [
            {
                label: 'Space ID',
                name: 'spaceId',
                type: 'string'
            },
            {
                label: 'Environment ID',
                name: 'environmentId',
                type: 'string'
            },
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
                toolset.sort((a: any, b: any) => a.name.localeCompare(b.name))

                return toolset.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))
            } catch (error) {
                console.error('Error listing actions:', error)
                return [
                    {
                        label: 'No Available Actions',
                        name: 'error',
                        description: 'No available actions, please check your Contentful Bot Token and refresh'
                    }
                ]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
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

        return tools.filter((tool: any) => mcpActions.includes(tool.name))
    }

    async getTools(nodeData: INodeData, options: ICommonObject): Promise<Tool[]> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const managementToken = getCredentialParam('managementToken', credentialData, nodeData)
        const spaceId = getCredentialParam('spaceId', credentialData, nodeData)

        const environmentId = nodeData.inputs?.environmentId

        if (!managementToken || !spaceId || !environmentId) {
            console.error('Contentful MCP: Missing Credentials - managementToken, spaceId, or environmentId not provided')
            return []
        }

        const packagePath = getNodeModulesPackagePath('@last-rev/contentful-mcp-server/bin/mcp-server.js')
        // Use process.execPath to ensure we use the correct Node.js executable regardless of environment
        const serverParams = {
            command: process.execPath,
            args: [packagePath, '--management-token', managementToken, '--space-id', spaceId, '--environment-id', environmentId]
        }

        const toolkit = new MCPToolkit(serverParams, 'stdio')
        await toolkit.initialize()

        const tools = toolkit.tools ?? []

        return tools as Tool[]
    }
}

module.exports = { nodeClass: Contentful_MCP }
