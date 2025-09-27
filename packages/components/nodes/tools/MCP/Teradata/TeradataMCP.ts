import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { MCPToolkit } from '../core'
import hash from 'object-hash'

class Teradata_MCP implements INode {
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

    constructor() {
        this.label = 'Teradata MCP'
        this.name = 'teradataMCP'
        this.version = 1.0
        this.type = 'Teradata MCP Tool'
        this.icon = 'teradata.svg'
        this.category = 'Tools (MCP)'
        this.description = 'MCP Server for Teradata (remote HTTP streamable)'
        this.documentation = 'https://github.com/Teradata/teradata-mcp-server'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['teradataTD2Auth', 'teradataBearerToken'],
            description: 'Needed when using Teradata MCP server with authentication'
        }
        this.inputs = [
            {
                label: 'MCP Server URL',
                name: 'mcpUrl',
                type: 'string',
                placeholder: 'http://teradata-mcp-server:8001/mcp',
                description: 'URL of your Teradata MCP server',
                optional: false
            },
            {
                label: 'Bearer Token',
                name: 'bearerToken',
                type: 'string',
                optional: true,
                description: 'Optional to override Default set credentials'
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
                        description: 'No available actions, please check your MCP server URL and credentials, then refresh.'
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
        const mcpUrl = nodeData.inputs?.mcpUrl || 'http://teradata-mcp-server:8001/mcp'
        if (!mcpUrl) {
            throw new Error('Missing MCP Server URL')
        }
        // Determine auth method from credentials
        let serverParams: any = {
            url: mcpUrl,
            headers: {}
        }
        // Get Bearer token from node input (from agent flow) or credential store
        const bearerToken = nodeData.inputs?.bearerToken || getCredentialParam('token', credentialData, nodeData)
        const username = getCredentialParam('tdUsername', credentialData, nodeData)
        const password = getCredentialParam('tdPassword', credentialData, nodeData)

        if (bearerToken) {
            serverParams.headers['Authorization'] = `Bearer ${bearerToken}`
        } else if (username && password) {
            serverParams.headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
        } else {
            throw new Error('Missing credentials: provide Bearer token from flow/credentials OR username/password from credentials')
        }
        const workspaceId = options?.searchOptions?.workspaceId?._value || options?.workspaceId || 'tdws_default'
        let sandbox: ICommonObject = {}
        const cacheKey = hash({ workspaceId, serverParams, sandbox })
        if (options.cachePool) {
            const cachedResult = await options.cachePool.getMCPCache(cacheKey)
            if (cachedResult) {
                if (cachedResult.tools.length > 0) {
                    return cachedResult.tools
                }
            }
        }

        // Use SSE for remote HTTP MCP servers
        const toolkit = new MCPToolkit(serverParams, 'sse')
        await toolkit.initialize()
        const tools = toolkit.tools ?? []
        if (options.cachePool) {
            await options.cachePool.addMCPCache(cacheKey, { toolkit, tools })
        }
        return tools as Tool[]
    }
}

module.exports = { nodeClass: Teradata_MCP }
