import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getNodeModulesPackagePath } from '../../../../src/utils'
import { MCPToolkit } from '../core'

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

function validateArguments(args: string[]): void {
    if (!args || !Array.isArray(args)) {
        return
    }

    for (const arg of args) {
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
                throw new Error(`Security Error: Argument "${arg}" contains potentially dangerous command references and is not allowed.`)
            }

            // Check for shell injection attempts in arguments
            if (
                suspiciousArg.includes('&&') ||
                suspiciousArg.includes('||') ||
                suspiciousArg.includes(';') ||
                suspiciousArg.includes('`') ||
                suspiciousArg.includes('$(') ||
                suspiciousArg.includes('${')
            ) {
                throw new Error(`Security Error: Argument "${arg}" contains potentially dangerous shell operators and is not allowed.`)
            }
        }
    }
}

class Supergateway_MCP implements INode {
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
        this.label = 'Supergateway MCP'
        this.name = 'supergatewayMCP'
        this.version = 1.0
        this.type = 'Supergateway MCP Tool'
        this.icon = 'supermachine-logo.png'
        this.category = 'Tools (MCP)'
        this.description = 'Runs MCP stdio-based servers over SSE (Server-Sent Events) or WebSockets (WS)'
        this.documentation = 'https://github.com/supercorp-ai/supergateway'
        this.inputs = [
            {
                label: 'Arguments',
                name: 'arguments',
                type: 'string',
                rows: 4,
                placeholder: '--sse "https://mcp-server-ab71a6b2-cd55-49d0-adba-562bc85956e3.supermachine.app"',
                description:
                    'Arguments to pass to the supergateway server. Refer to the <a href="https://github.com/supercorp-ai/supergateway/blob/main/README.md" target="_blank">documentation</a> for more information.'
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
                        description: 'No available actions, please check the arguments again and refresh'
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

    async getTools(nodeData: INodeData, _: ICommonObject): Promise<Tool[]> {
        const _args = nodeData.inputs?.arguments as string
        const packagePath = getNodeModulesPackagePath('supergateway/dist/index.js')

        const processedArgs = _args
            .trim()
            .split(/\s+/)
            .map((arg) => {
                // Remove surrounding double or single quotes if they exist
                if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
                    return arg.slice(1, -1)
                }
                return arg
            })

        // Security validation: Check for dangerous arguments
        // TODO: To be removed and only allow Remote MCP for Cloud
        if (process.env.CUSTOM_MCP_SECURITY_CHECK === 'true') {
            validateArguments(processedArgs)
        }

        const serverParams = {
            command: 'node',
            args: [packagePath, ...processedArgs]
        }

        // Security validation: Check for dangerous commands
        // TODO: To be removed and only allow Remote MCP for Cloud
        if (process.env.CUSTOM_MCP_SECURITY_CHECK === 'true') {
            validateCommand(serverParams.command)
        }

        const toolkit = new MCPToolkit(serverParams, 'stdio')
        await toolkit.initialize()

        const tools = toolkit.tools ?? []

        return tools as Tool[]
    }
}

module.exports = { nodeClass: Supergateway_MCP }
