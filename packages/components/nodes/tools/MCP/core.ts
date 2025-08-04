import {
    CallToolRequest,
    CallToolResultSchema,
    ListToolsResult,
    ListToolsResultSchema,
    LoggingMessageNotificationSchema
} from '@modelcontextprotocol/sdk/types.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport, StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js'
import { BaseToolkit, tool, Tool } from '@langchain/core/tools'
import { z } from 'zod'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { MCP_STREAMING_CONFIG } from './config.js'

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

    // Method to create a new client with transport and detect streaming capabilities
    async createClient(): Promise<{ client: Client; hasStreaming: boolean }> {
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

        // Check server capabilities for streaming support
        let hasStreaming = false
        try {
            const capabilities = client.getServerCapabilities()
            // Check for streaming capability in experimental or notifications section
            hasStreaming =
                (capabilities as any)?.notifications?.streaming === true ||
                (capabilities as any)?.experimental?.notifications?.streaming === true
        } catch (error) {
            console.error(`⚠️ [MCP Core] Could not detect streaming capabilities, falling back to non-streaming:`, error.message)
        }

        return { client, hasStreaming }
    }

    async initialize() {
        if (this._tools === null) {
            const { client } = await this.createClient()
            this.client = client

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
                argsSchema: createSchemaModel(tool.inputSchema),
                annotations: tool.annotations || {}
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
    argsSchema,
    annotations = {}
}: {
    toolkit: MCPToolkit
    name: string
    description: string
    argsSchema: any
    annotations?: any
}): Promise<Tool> {
    const { client, hasStreaming } = await toolkit.createClient()
    await client.close()

    const toolHasStreaming = annotations.streaming_enabled === true
    const shouldUseStreaming = hasStreaming && toolHasStreaming

    return tool(
        async (input, config): Promise<string> => {
            return await executeMCPTool(toolkit, name, input, config, annotations)
        },
        {
            name: name,
            description: shouldUseStreaming ? `${description} ${MCP_STREAMING_CONFIG.STREAMING_MARKER}` : description,
            schema: argsSchema
        }
    )
}

async function executeMCPTool(toolkit: MCPToolkit, name: string, input: any, config: any, annotations: any = {}): Promise<string> {
    const { chatId, sseStreamer } = extractConfig(config, input)
    const { client, hasStreaming } = await toolkit.createClient()
    const notifications: string[] = []

    // Only use streaming if both server and tool support it
    const toolHasStreaming = annotations.streaming_enabled === true
    const shouldUseStreaming = hasStreaming && toolHasStreaming

    try {
        setupStreamingIfSupported(shouldUseStreaming, sseStreamer, chatId, name)
        setupNotificationHandlers(client, sseStreamer, chatId, name, shouldUseStreaming, notifications, annotations)

        const toolResponse = await callMCPTool(client, name, input)

        return await handleToolResponse(toolResponse, shouldUseStreaming, sseStreamer, chatId, name, notifications)
    } finally {
        if (!shouldUseStreaming) {
            await client.close()
        }
    }
}

function extractConfig(config: any, input?: any): { chatId: string; sseStreamer: any } {
    const configChatId = config?.configurable?.flowise_chatId
    const configSseStreamer = config?.configurable?.sseStreamer
    const inputChatId = input?.flowise_chatId

    return {
        chatId: configChatId || inputChatId,
        sseStreamer: configSseStreamer
    }
}

function setupStreamingIfSupported(hasStreaming: boolean, sseStreamer: any, chatId: string, name: string): void {
    if (hasStreaming && sseStreamer && chatId) {
        sseStreamer.addMcpConnection(chatId, name)
    }
}

async function callMCPTool(client: Client, name: string, input: any): Promise<string> {
    const progressToken = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const req: CallToolRequest = {
        method: 'tools/call',
        params: {
            name: name,
            arguments: input as any,
            _meta: { progressToken }
        }
    }

    const res = await client.request(req, CallToolResultSchema)
    return JSON.stringify(res.content)
}

async function handleToolResponse(
    contentString: string,
    hasStreaming: boolean,
    sseStreamer: any,
    chatId: string,
    name: string,
    notifications: string[]
): Promise<string> {
    // Non-streaming tools return immediately
    if (!hasStreaming || !sseStreamer || !chatId) {
        if (sseStreamer && chatId) {
            sseStreamer.removeMcpConnection(chatId, name)
        }
        return contentString
    }

    // Streaming tools wait for completion
    return waitForStreamingCompletion(contentString, sseStreamer, chatId, name, notifications)
}

function waitForStreamingCompletion(
    contentString: string,
    sseStreamer: any,
    chatId: string,
    name: string,
    notifications: string[]
): Promise<string> {
    return new Promise<string>((resolve) => {
        let completed = false

        const completeExecution = (reason: string) => {
            if (completed) return
            completed = true

            const fullResponse = buildFullResponse(contentString, notifications)
            resolve(fullResponse)
        }

        // Poll for completion
        const pollInterval = setInterval(() => {
            if (!sseStreamer.hasMcpConnections(chatId)) {
                clearInterval(pollInterval)
                completeExecution('✅')
            }
        }, 500)

        // Fallback timeout
        setTimeout(() => {
            clearInterval(pollInterval)
            sseStreamer.removeMcpConnection(chatId, name)
            completeExecution('⏰')
        }, MCP_STREAMING_CONFIG.DEFAULT_COMPLETION_TIMEOUT)
    })
}

function buildFullResponse(contentString: string, notifications: string[]): string {
    return notifications.length > 0 ? `${contentString}\n\n--- Execution Log ---\n${notifications.join('\n')}` : contentString
}

function setupNotificationHandlers(
    client: Client,
    sseStreamer: any,
    chatId: string,
    toolName: string,
    shouldUseStreaming: boolean,
    notifications?: string[],
    annotations: any = {}
) {
    if (!shouldUseStreaming || !sseStreamer || !chatId) {
        return
    }

    // Get completion signals from annotations, fallback to default
    const completionSignals = annotations.notification_types || ['task_completion']

    client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
        const message = String(notification.params.data)

        // Stream to UI
        sseStreamer.streamTokenEvent(chatId, `\n🔔 ${toolName}: ${message}\n`)

        // Collect for final response
        if (notifications) {
            notifications.push(message)
        }

        const { logger } = notification.params

        // Detect completion based on tool's annotation signals
        if (completionSignals.includes(logger)) {
            // Add visual separation before LLM response
            sseStreamer.streamTokenEvent(chatId, '\n\n')

            // Trigger cleanup after brief delay
            setTimeout(() => {
                sseStreamer.removeMcpConnection(chatId, toolName)
            }, MCP_STREAMING_CONFIG.NOTIFICATION_DELAY)
        }
    })
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

    // Add Flowise context fields to allow them through schema validation
    schemaProperties['flowise_chatId'] = z.string().optional()

    return z.object(schemaProperties)
}

export const validateArgsForLocalFileAccess = (args: string[]): void => {
    const dangerousPatterns = [
        // Absolute paths
        /^\/[^/]/, // Unix absolute paths starting with /
        /^[a-zA-Z]:\\/, // Windows absolute paths like C:\

        // Relative paths that could escape current directory
        /\.\.\//, // Parent directory traversal with ../
        /\.\.\\/, // Parent directory traversal with ..\
        /^\.\./, // Starting with ..

        // Local file access patterns
        /^\.\//, // Current directory with ./
        /^~\//, // Home directory with ~/
        /^file:\/\//, // File protocol

        // Common file extensions that shouldn't be accessed
        /\.(exe|bat|cmd|sh|ps1|vbs|scr|com|pif|dll|sys)$/i,

        // File flags and options that could access local files
        /^--?(?:file|input|output|config|load|save|import|export|read|write)=/i,
        /^--?(?:file|input|output|config|load|save|import|export|read|write)$/i
    ]

    for (const arg of args) {
        if (typeof arg !== 'string') continue

        // Check for dangerous patterns
        for (const pattern of dangerousPatterns) {
            if (pattern.test(arg)) {
                throw new Error(`Argument contains potential local file access: "${arg}"`)
            }
        }

        // Check for null bytes
        if (arg.includes('\0')) {
            throw new Error(`Argument contains null byte: "${arg}"`)
        }

        // Check for very long paths that might be used for buffer overflow attacks
        if (arg.length > 1000) {
            throw new Error(`Argument is suspiciously long (${arg.length} characters): "${arg.substring(0, 100)}..."`)
        }
    }
}
