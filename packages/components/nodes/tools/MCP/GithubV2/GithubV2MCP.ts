import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { MCPToolkit } from '../core'

class GithubV2_MCP implements INode {
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
        this.label = 'Github V2 MCP (Remote)'
        this.name = 'githubV2MCP'
        this.version = 1.0
        this.type = 'Github V2 MCP Tool'
        this.icon = 'github.svg'
        this.category = 'Tools (MCP)'
        this.description = 'Official GitHub MCP Server (Remote/Cloud Version) with enhanced capabilities'
        this.documentation = 'https://github.com/github/github-mcp-server'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['githubApi']
        }
        this.inputs = [
            {
                label: 'Available Actions',
                name: 'mcpActions',
                type: 'asyncMultiOptions',
                loadMethod: 'listActions',
                refresh: true,
                description: 'Select from 15+ toolsets including Actions, Issues, PRs, Discussions, and more'
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
                        description: 'No available actions, please check your Github Access Token and refresh'
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
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        if (!accessToken) {
            throw new Error('Missing Github Access Token')
        }

        // Remote GitHub MCP Server configuration
        const serverParams = {
            url: 'https://api.githubcopilot.com/mcp/',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }

        const toolkit = new MCPToolkit(serverParams, 'sse')
        await toolkit.initialize()

        const tools = toolkit.tools ?? []

        return tools as Tool[]
    }
}

module.exports = { nodeClass: GithubV2_MCP }
