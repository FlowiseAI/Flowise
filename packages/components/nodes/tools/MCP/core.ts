import { CallToolRequest, CallToolResultSchema, ListToolsResult, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport, StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js'
import { BaseToolkit, tool, Tool } from '@langchain/core/tools'
import { z } from 'zod'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

export class MCPToolkit extends BaseToolkit {
    tools: Tool[] = []
    _tools: ListToolsResult | null = null
    model_config: any
    transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport | null = null
    client: Client | null = null
    serverParams: StdioServerParameters | any
    transportType: 'stdio' | 'sse'
    constructor(serverParams: StdioServerParameters | any, transportType: 'stdio' | 'sse') {
        super()
        this.serverParams = serverParams
        this.transportType = transportType
    }

    // Method to create a new client with transport
    async createClient(): Promise<Client> {
        const client = new Client(
            {
                name: 'flowise-client',
                version: '1.0.0'
            },
            {
                capabilities: {}
            }
        )

        let transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport

        if (this.transportType === 'stdio') {
            // Compatible with overridden PATH configuration
            const params = {
                ...this.serverParams,
                env: {
                    ...(this.serverParams.env || {}),
                    PATH: process.env.PATH
                }
            }

            transport = new StdioClientTransport(params as StdioServerParameters)
            await client.connect(transport)
        } else {
            if (this.serverParams.url === undefined) {
                throw new Error('URL is required for SSE transport')
            }

            const baseUrl = new URL(this.serverParams.url)
            try {
                if (this.serverParams.headers) {
                    transport = new StreamableHTTPClientTransport(baseUrl, {
                        requestInit: {
                            headers: this.serverParams.headers
                        }
                    })
                } else {
                    transport = new StreamableHTTPClientTransport(baseUrl)
                }
                await client.connect(transport)
            } catch (error) {
                if (this.serverParams.headers) {
                    transport = new SSEClientTransport(baseUrl, {
                        requestInit: {
                            headers: this.serverParams.headers
                        },
                        eventSourceInit: {
                            fetch: (url, init) => fetch(url, { ...init, headers: this.serverParams.headers })
                        }
                    })
                } else {
                    transport = new SSEClientTransport(baseUrl)
                }
                await client.connect(transport)
            }
        }

        return client
    }

    async initialize() {
        if (this._tools === null) {
            this.client = await this.createClient()

            this._tools = await this.client.request({ method: 'tools/list' }, ListToolsResultSchema)

            this.tools = await this.get_tools()

            // Close the initial client after initialization
            await this.client.close()
        }
    }

    async get_tools(): Promise<Tool[]> {
        if (this._tools === null || this.client === null) {
            throw new Error('Must initialize the toolkit first')
        }
        const toolsPromises = this._tools.tools.map(async (tool: any) => {
            if (this.client === null) {
                throw new Error('Client is not initialized')
            }
            return await MCPTool({
                toolkit: this,
                name: tool.name,
                description: tool.description || '',
                argsSchema: createSchemaModel(tool.inputSchema)
            })
        })
        const res = await Promise.allSettled(toolsPromises)
        const errors = res.filter((r) => r.status === 'rejected')
        if (errors.length !== 0) {
            console.error('MCP Tools falied to be resolved', errors)
        }
        const successes = res.filter((r) => r.status === 'fulfilled').map((r) => r.value)
        return successes
    }
}

export async function MCPTool({
    toolkit,
    name,
    description,
    argsSchema
}: {
    toolkit: MCPToolkit
    name: string
    description: string
    argsSchema: any
}): Promise<Tool> {
    return tool(
        async (input): Promise<string> => {
            // Create a new client for this request
            const client = await toolkit.createClient()

            try {
                const req: CallToolRequest = { method: 'tools/call', params: { name: name, arguments: input as any } }
                const res = await client.request(req, CallToolResultSchema)
                const content = res.content
                const contentString = JSON.stringify(content)
                return contentString
            } finally {
                // Always close the client after the request completes
                await client.close()
            }
        },
        {
            name: name,
            description: description,
            schema: argsSchema
        }
    )
}

function createSchemaModel(
    inputSchema: {
        type: 'object'
        properties?: import('zod').objectOutputType<{}, import('zod').ZodTypeAny, 'passthrough'> | undefined
    } & { [k: string]: unknown }
): any {
    if (inputSchema.type !== 'object' || !inputSchema.properties) {
        throw new Error('Invalid schema type or missing properties')
    }

    const schemaProperties = Object.entries(inputSchema.properties).reduce((acc, [key, _]) => {
        acc[key] = z.any()
        return acc
    }, {} as Record<string, import('zod').ZodTypeAny>)

    return z.object(schemaProperties)
}

/**
 * TODO: To be removed and only allow Remote MCP for Cloud
 * Validates MCP server configuration to prevent execution of dangerous commands
 */
export function validateMCPServerSecurity(serverParams: any): void {
    // Comprehensive list of dangerous commands that could compromise system security
    const dangerousCommands = [
        // Shell interpreters and command processors
        'sh',
        'bash',
        'zsh',
        'fish',
        'csh',
        'tcsh',
        'ksh',
        'ash',
        'dash',
        'cmd',
        'command',
        'powershell',
        'pwsh',
        'cmd.exe',
        'powershell.exe',
        'wsl',
        'wsl.exe',
        'ubuntu',
        'debian',

        // File operations that could read/write sensitive files
        'cat',
        'more',
        'less',
        'head',
        'tail',
        'tee',
        'cp',
        'mv',
        'rm',
        'del',
        'copy',
        'move',
        'type',
        'ren',
        'rename',
        'ln',
        'link',
        'unlink',
        'touch',
        'mkdir',
        'rmdir',
        'rd',
        'md',
        'makedir',

        // Directory operations and file system navigation
        'ls',
        'dir',
        'pwd',
        'cd',
        'find',
        'locate',
        'tree',
        'du',
        'df',
        'pushd',
        'popd',
        'dirs',
        'whereis',
        'which',
        'where',
        'stat',

        // Network operations that could exfiltrate data or download malicious content
        'curl',
        'wget',
        'nc',
        'netcat',
        'ping',
        'nslookup',
        'dig',
        'host',
        'telnet',
        'ssh',
        'scp',
        'rsync',
        'ftp',
        'sftp',
        'icat',
        'socat',

        // System operations and process management
        'ps',
        'top',
        'htop',
        'kill',
        'killall',
        'pkill',
        'pgrep',
        'jobs',
        'systemctl',
        'service',
        'chkconfig',
        'update-rc.d',
        'systemd',
        'crontab',
        'at',
        'batch',
        'nohup',
        'screen',
        'tmux',

        // Archive operations that could be used for data exfiltration
        'tar',
        'zip',
        'unzip',
        'gzip',
        'gunzip',
        'bzip2',
        'bunzip2',
        'xz',
        'unxz',
        '7z',
        'rar',
        'unrar',
        'compress',
        'uncompress',
        'cpio',
        'ar',

        // Text processing tools that could read sensitive files
        'grep',
        'awk',
        'sed',
        'sort',
        'uniq',
        'cut',
        'tr',
        'wc',
        'diff',
        'patch',
        'strings',
        'hexdump',
        'od',
        'xxd',
        'base64',
        'base32',

        // File editors that could modify system files
        'vi',
        'vim',
        'nano',
        'emacs',
        'gedit',
        'notepad',
        'notepad.exe',
        'pico',
        'joe',
        'micro',
        'code',
        'subl',
        'atom',

        // Process execution and evaluation commands
        'exec',
        'eval',
        'system',
        'spawn',
        'fork',
        'clone',
        'source',
        'sudo',
        'su',
        'runuser',
        'doas',
        'pfexec',

        // Package managers that could install malicious software
        'npm',
        'yarn',
        'pnpm',
        'pip',
        'pip3',
        'apt',
        'apt-get',
        'yum',
        'dnf',
        'pacman',
        'brew',
        'choco',
        'winget',
        'scoop',
        'snap',
        'flatpak',

        // Compilers and interpreters that could execute arbitrary code
        'python',
        'python3',
        'nodejs',
        'java',
        'javac',
        'gcc',
        'g++',
        'clang',
        'clang++',
        'ruby',
        'perl',
        'php',
        'go',
        'rust',
        'cargo',
        'dotnet',
        'mono',
        'scala',
        'kotlin',
        'swift',

        // Database clients that could access sensitive data
        'mysql',
        'psql',
        'mongo',
        'mongosh',
        'redis-cli',
        'sqlite3',
        'sqlcmd',
        'isql',
        'osql',
        'bcp',

        // Development and deployment tools
        'git',
        'docker',
        'podman',
        'kubectl',
        'helm',
        'terraform',
        'ansible',
        'vagrant',
        'chef',
        'puppet',
        'saltstack',
        'make',
        'cmake',

        // System information and configuration tools
        'uname',
        'whoami',
        'id',
        'groups',
        'env',
        'set',
        'printenv',
        'export',
        'mount',
        'umount',
        'lsblk',
        'fdisk',
        'parted',
        'lsmod',
        'modprobe',

        // File permissions and ownership commands
        'chmod',
        'chown',
        'chgrp',
        'umask',
        'setfacl',
        'getfacl',
        'lsattr',
        'chattr',

        // Network configuration and monitoring
        'ifconfig',
        'ip',
        'route',
        'netstat',
        'ss',
        'lsof',
        'tcpdump',
        'wireshark',
        'iptables',
        'ufw',
        'firewall-cmd',

        // Boot and system control
        'init',
        'telinit',
        'shutdown',
        'reboot',
        'halt',
        'poweroff',

        // Hardware and kernel interaction
        'dmesg',
        'lspci',
        'lsusb',
        'dmidecode',
        'hdparm',
        'smartctl'
    ]

    /**
     * Checks a string for dangerous commands and patterns
     * @param str - The string to check
     * @param context - Context information for better error messages
     */
    function checkString(str: string, context: string = ''): void {
        if (typeof str !== 'string') return

        const lowerStr = str.toLowerCase().trim()
        const contextPrefix = context ? `${context}: ` : ''

        for (const cmd of dangerousCommands) {
            const cmdLower = cmd.toLowerCase()
            // Escape special regex characters in command name
            const escapedCmd = cmdLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

            if (
                lowerStr === cmdLower || // 1. Exact match: "cat" === "cat"
                lowerStr.startsWith(cmdLower + ' ') || // 2. Command with space args: "cat /etc/passwd"
                lowerStr.startsWith(cmdLower + '\t') || // 3. Command with tab args: "cat\t/etc/passwd"
                lowerStr.endsWith('/' + cmdLower) || // 4. Unix absolute path: "/bin/sh"
                lowerStr.includes('\\' + cmdLower + '.exe') || // 5. Windows executable: "C:\\Windows\\cmd.exe"
                lowerStr.includes('/' + cmdLower + ' ') || // 6. Unix path with args: "/bin/sh -c"
                lowerStr.includes('\\' + cmdLower + ' ') || // 7. Windows path with args: "C:\\bin\\sh.exe -c"
                new RegExp(`\\b${escapedCmd}\\b`).test(lowerStr)
            ) {
                // 8. Word boundary match: catches embedded commands
                throw new Error(`${contextPrefix}Dangerous command detected: "${cmd}" in "${str}"`)
            }
        }

        // 2. Check for null bytes (binary content or encoding attacks)
        if (str.includes('\0')) {
            throw new Error(`${contextPrefix}Null byte detected in string: "${str}"`)
        }
    }

    /**
     * Recursively validates an object for dangerous content
     * This function traverses the entire object tree to ensure no malicious content is hidden
     * @param obj - The object to validate (can be string, array, object, or primitive)
     * @param path - The current path in the object (for error reporting and debugging)
     */
    function validateObject(obj: any, path: string = ''): void {
        // Skip null/undefined values
        if (obj === null || obj === undefined) return

        if (typeof obj === 'string') {
            // Validate string content for dangerous commands and patterns
            checkString(obj, path)
        } else if (Array.isArray(obj)) {
            // Recursively validate each array element
            obj.forEach((item, index) => {
                validateObject(item, `${path}[${index}]`)
            })
        } else if (typeof obj === 'object') {
            // Recursively validate each object property
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key
                // Validate only the property value
                validateObject(value, currentPath)
            }
        }
    }

    validateObject(serverParams, 'serverParams')

    if (serverParams.command) {
        const cmd = serverParams.command.toLowerCase()
        if (cmd.includes('sh') || cmd.includes('cmd') || cmd.includes('powershell') || cmd.includes('eval')) {
            throw new Error(`Command field contains dangerous interpreter: "${serverParams.command}"`)
        }
    }

    if (serverParams.env) {
        for (const [key, value] of Object.entries(serverParams.env)) {
            if (typeof value === 'string' && (value.includes('$(') || value.includes('`'))) {
                throw new Error(`Environment variable "${key}" contains command substitution: "${value}"`)
            }
        }
    }

    if (serverParams.cwd) {
        checkString(serverParams.cwd, 'cwd')
        const cwd = serverParams.cwd.toLowerCase()
        if (
            cwd.startsWith('/bin') ||
            cwd.startsWith('/sbin') ||
            cwd.startsWith('/etc') ||
            cwd.includes('system32') ||
            cwd.includes('program files')
        ) {
            throw new Error(`Working directory points to sensitive system location: "${serverParams.cwd}"`)
        }
    }
}
