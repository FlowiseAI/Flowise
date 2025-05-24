import { Tool } from '@langchain/core/tools'
import { INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { MCPToolkit } from '../core'

const mcpServerConfig = `{
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
}`

interface IMCPInputVariables {
    variableName: string
    variableValue: string
}

class Custom_MCP implements INode {
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
        this.label = 'Custom MCP'
        this.name = 'customMCP'
        this.version = 1.0
        this.type = 'Custom MCP Tool'
        this.icon = 'customMCP.png'
        this.category = 'Tools (MCP)'
        this.description = 'Custom MCP Config'
        this.documentation = 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search'
        this.inputs = [
            {
                label: 'Input Variables',
                name: 'mcpInputVariables',
                description: 'Input variables can be used in the MCP Server Config with prefix $. For example: $var',
                type: 'array',
                optional: true,
                acceptVariable: true,
                array: [
                    {
                        label: 'Variable Name',
                        name: 'variableName',
                        type: 'string'
                    },
                    {
                        label: 'Variable Value',
                        name: 'variableValue',
                        type: 'string',
                        acceptVariable: true
                    }
                ]
            },
            {
                label: 'MCP Server Config',
                name: 'mcpServerConfig',
                type: 'code',
                hideCodeExecute: true,
                placeholder: mcpServerConfig
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
        listActions: async (nodeData: INodeData): Promise<INodeOptionsValue[]> => {
            try {
                const toolset = await this.getTools(nodeData)
                toolset.sort((a: any, b: any) => a.name.localeCompare(b.name))

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

    async init(nodeData: INodeData): Promise<any> {
        const tools = await this.getTools(nodeData)

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

    async getTools(nodeData: INodeData): Promise<Tool[]> {
        const mcpServerConfig = nodeData.inputs?.mcpServerConfig as string

        if (!mcpServerConfig) {
            throw new Error('MCP Server Config is required')
        }

        const mcpInputVariables = (nodeData.inputs?.mcpInputVariables as IMCPInputVariables[]) ?? []

        let sandbox: Record<string, string> = {}
        for (const item of mcpInputVariables) {
            const variableName = item.variableName
            const variableValue = stripHtmlTags(item.variableValue)
            sandbox[`$${variableName}`] = variableValue
        }

        try {
            let serverParams
            if (typeof mcpServerConfig === 'object') {
                serverParams = substituteVariablesInObject(mcpServerConfig, sandbox)
            } else if (typeof mcpServerConfig === 'string') {
                const substitutedString = substituteVariablesInString(mcpServerConfig, sandbox)
                const serverParamsString = convertToValidJSONString(substitutedString)
                serverParams = JSON.parse(serverParamsString)
            }

            // Compatible with stdio and SSE
            let toolkit: MCPToolkit
            if (serverParams?.command === undefined) {
                toolkit = new MCPToolkit(serverParams, 'sse')
            } else {
                toolkit = new MCPToolkit(serverParams, 'stdio')
            }

            await toolkit.initialize()

            const tools = toolkit.tools ?? []

            return tools as Tool[]
        } catch (error) {
            throw new Error(`Invalid MCP Server Config: ${error}`)
        }
    }
}

function substituteVariablesInObject(obj: any, sandbox: any): any {
    if (typeof obj === 'string') {
        // Replace variables in string values
        return substituteVariablesInString(obj, sandbox)
    } else if (Array.isArray(obj)) {
        // Recursively process arrays
        return obj.map((item) => substituteVariablesInObject(item, sandbox))
    } else if (obj !== null && typeof obj === 'object') {
        // Recursively process object properties
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
            result[key] = substituteVariablesInObject(value, sandbox)
        }
        return result
    }
    // Return primitive values as-is
    return obj
}

function substituteVariablesInString(str: string, sandbox: any): string {
    // Use regex to find $variableName patterns and replace with sandbox values
    return str.replace(/\$(\w+)/g, (match, variableName) => {
        const sandboxKey = `$${variableName}`
        return Object.keys(sandbox).includes(sandboxKey) ? sandbox[sandboxKey] : match
    })
}

function convertToValidJSONString(inputString: string) {
    try {
        const jsObject = Function('return ' + inputString)()
        return JSON.stringify(jsObject, null, 2)
    } catch (error) {
        console.error('Error converting to JSON:', error)
        return ''
    }
}

function stripHtmlTags(inputString: string): string {
    return inputString.replace(/<[^>]*>/g, '')
}

module.exports = { nodeClass: Custom_MCP }
