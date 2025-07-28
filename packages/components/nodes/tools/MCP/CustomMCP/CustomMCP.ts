import { Tool } from '@langchain/core/tools'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { MCPToolkit } from '../core'
import { getVars, prepareSandboxVars } from '../../../../src/utils'
import { DataSource } from 'typeorm'
import hash from 'object-hash'

// List of dangerous commands that are banned for security reasons
const BANNED_COMMANDS = [
    'sh',
    'bash',
    'zsh',
    'fish',
    'csh',
    'tcsh',
    'ksh',
    'dash',
    '/bin/sh',
    '/bin/bash',
    '/bin/zsh',
    '/bin/fish',
    '/bin/csh',
    '/bin/tcsh',
    '/bin/ksh',
    '/bin/dash',
    '/usr/bin/sh',
    '/usr/bin/bash',
    '/usr/bin/zsh',
    '/usr/bin/fish',
    '/usr/bin/csh',
    '/usr/bin/tcsh',
    '/usr/bin/ksh',
    '/usr/bin/dash',
    'cmd',
    'cmd.exe',
    'powershell',
    'powershell.exe',
    'pwsh',
    'pwsh.exe',
    'perl',
    'ruby',
    'php',
    'eval',
    'exec',
    'system'
]

// Additional dangerous command patterns to check
const DANGEROUS_PATTERNS = [
    /^\/bin\//,
    /^\/usr\/bin\//,
    /^\/usr\/local\/bin\//,
    /^\/sbin\//,
    /^\/usr\/sbin\//,
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.ps1$/i,
    /\.sh$/i
]

function validateCommand(command: string): void {
    if (!command || typeof command !== 'string') {
        return
    }

    const normalizedCommand = command.toLowerCase().trim()

    // Check against banned commands list
    for (const bannedCmd of BANNED_COMMANDS) {
        if (
            normalizedCommand === bannedCmd.toLowerCase() ||
            normalizedCommand.endsWith(`/${bannedCmd.toLowerCase()}`) ||
            normalizedCommand.endsWith(`\\${bannedCmd.toLowerCase()}`)
        ) {
            throw new Error(
                `Security Error: Command "${command}" is banned for security reasons. Shell access and executable commands are not allowed.`
            )
        }
    }

    // Check against dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(normalizedCommand)) {
            throw new Error(`Security Error: Command "${command}" matches a dangerous pattern and is not allowed for security reasons.`)
        }
    }

    // Additional checks for potential shell injection attempts
    if (
        normalizedCommand.includes('&&') ||
        normalizedCommand.includes('||') ||
        normalizedCommand.includes(';') ||
        normalizedCommand.includes('|') ||
        normalizedCommand.includes('`') ||
        normalizedCommand.includes('$(') ||
        normalizedCommand.includes('${')
    ) {
        throw new Error(`Security Error: Command "${command}" contains potentially dangerous shell operators and is not allowed.`)
    }
}

const mcpServerConfig = `{
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
}`

const howToUseCode = `
You can use variables in the MCP Server Config with double curly braces \`{{ }}\` and prefix \`$vars.<variableName>\`. 

For example, you have a variable called "var1":
\`\`\`json
{
    "command": "docker",
    "args": [
        "run",
        "-i",
        "--rm",
        "-e", "API_TOKEN"
    ],
    "env": {
        "API_TOKEN": "{{$vars.var1}}"
    }
}
\`\`\`

For example, when using SSE, you can use the variable "var1" in the headers:
\`\`\`json
{
    "url": "https://api.example.com/endpoint/sse",
    "headers": {
        "Authorization": "Bearer {{$vars.var1}}"
    }
}
\`\`\`
`

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
        this.version = 1.1
        this.type = 'Custom MCP Tool'
        this.icon = 'customMCP.png'
        this.category = 'Tools (MCP)'
        this.description = 'Custom MCP Config'
        this.documentation = 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search'
        this.inputs = [
            {
                label: 'MCP Server Config',
                name: 'mcpServerConfig',
                type: 'code',
                hideCodeExecute: true,
                hint: {
                    label: 'How to use',
                    value: howToUseCode
                },
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
        const mcpServerConfig = nodeData.inputs?.mcpServerConfig as string
        if (!mcpServerConfig) {
            throw new Error('MCP Server Config is required')
        }

        let sandbox: ICommonObject = {}

        if (mcpServerConfig.includes('$vars')) {
            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity

            const variables = await getVars(appDataSource, databaseEntities, nodeData, options)
            sandbox['$vars'] = prepareSandboxVars(variables)
        }

        const workspaceId = options?.searchOptions?.workspaceId?._value || options?.workspaceId

        let canonicalConfig
        try {
            canonicalConfig = JSON.parse(mcpServerConfig)
        } catch (e) {
            canonicalConfig = mcpServerConfig
        }

        const cacheKey = hash({ workspaceId, canonicalConfig, sandbox })

        if (options.cachePool) {
            const cachedResult = await options.cachePool.getMCPCache(cacheKey)
            if (cachedResult) {
                return cachedResult.tools
            }
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

            // Security validation: Check for dangerous commands
            // TODO: To be removed and only allow Remote MCP for Cloud
            if (serverParams?.command && process.env.CUSTOM_MCP_SECURITY_CHECK === 'true') {
                validateCommand(serverParams.command)
            }

            // Also validate any commands in args that might be suspicious
            // TODO: To be removed and only allow Remote MCP for Cloud
            if (serverParams?.args && Array.isArray(serverParams.args) && process.env.CUSTOM_MCP_SECURITY_CHECK === 'true') {
                for (const arg of serverParams.args) {
                    if (typeof arg === 'string') {
                        // Check if any argument looks like it's trying to execute a shell command
                        const suspiciousArg = arg.toLowerCase().trim()
                        if (
                            suspiciousArg.startsWith('/bin/') ||
                            suspiciousArg.startsWith('/usr/bin/') ||
                            suspiciousArg.includes('sh') ||
                            suspiciousArg.includes('bash') ||
                            suspiciousArg.includes('cmd') ||
                            suspiciousArg.includes('powershell')
                        ) {
                            throw new Error(
                                `Security Error: Argument "${arg}" contains potentially dangerous command references and is not allowed.`
                            )
                        }
                    }
                }
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

            if (options.cachePool) {
                await options.cachePool.addMCPCache(cacheKey, { toolkit, tools })
            }

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
    // Use regex to find {{$variableName.property}} patterns and replace with sandbox values
    return str.replace(/\{\{\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g, (match, variablePath) => {
        try {
            // Split the path into parts (e.g., "vars.testvar1" -> ["vars", "testvar1"])
            const pathParts = variablePath.split('.')

            // Start with the sandbox object
            let current = sandbox

            // Navigate through the path
            for (const part of pathParts) {
                // For the first part, check if it exists with $ prefix
                if (current === sandbox) {
                    const sandboxKey = `$${part}`
                    if (Object.keys(current).includes(sandboxKey)) {
                        current = current[sandboxKey]
                    } else {
                        // If the key doesn't exist, return the original match
                        return match
                    }
                } else {
                    // For subsequent parts, access directly
                    if (current && typeof current === 'object' && part in current) {
                        current = current[part]
                    } else {
                        // If the property doesn't exist, return the original match
                        return match
                    }
                }
            }

            // Return the resolved value, converting to string if necessary
            return typeof current === 'string' ? current : JSON.stringify(current)
        } catch (error) {
            // If any error occurs during resolution, return the original match
            console.warn(`Error resolving variable ${match}:`, error)
            return match
        }
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

module.exports = { nodeClass: Custom_MCP }
