/**
 * MCP Server Node Pattern Example
 *
 * This file implements a Sequential Thinking MCP server node following the standard pattern described in MCP/README.md.
 *
 * Key requirements:
 * - Implements INode interface
 * - Sets tags = ['AAI'] for UI Answer tab integration
 * - Sets category = 'MCP Servers'
 * - Exposes available actions via mcpActions input
 * - Registers the node as module.exports = { nodeClass: SequentialThinking_MCP }
 *
 * For more details and a template, see MCP/README.md.
 * All comments and documentation must be in English.
 */
import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getNodeModulesPackagePath } from '../../../../src/utils'
import { MCPToolkit } from '../core'

class SequentialThinking_MCP implements INode {
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
        this.label = 'Sequential Thinking MCP'
        this.name = 'sequentialThinkingMCP'
        this.version = 1.0
        this.type = 'Sequential Thinking MCP Tool'
        this.icon = 'sequentialthinking.svg'
        this.category = 'MCP Servers'
        this.tags = ['AAI']
        this.description =
            'MCP server that provides a tool for dynamic and reflective problem-solving through a structured thinking process'
        this.documentation = 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking'
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
                        description: 'No available actions, please refresh'
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

    async getTools(_nodeData: INodeData, _options: ICommonObject): Promise<Tool[]> {
        const packagePath = getNodeModulesPackagePath('@modelcontextprotocol/server-sequential-thinking/dist/index.js')

        const serverParams = {
            command: 'node',
            args: [packagePath]
        }

        const toolkit = new MCPToolkit(serverParams, 'stdio')
        await toolkit.initialize()

        const tools = toolkit.tools ?? []

        return tools as Tool[]
    }
}

module.exports = { nodeClass: SequentialThinking_MCP }
