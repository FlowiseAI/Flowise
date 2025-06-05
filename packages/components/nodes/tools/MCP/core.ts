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
    client: Client | null = null // Client used for initialize(), closed afterwards
    serverParams: StdioServerParameters | any
    transportType: 'stdio' | 'sse'

    constructor(serverParams: StdioServerParameters | any, transportType: 'stdio' | 'sse') {
        super()
        this.serverParams = serverParams
        this.transportType = transportType
    }

    // Method to create a new client, connect it, and handle headers
    async createClient(): Promise<Client> {
        const client = new Client({ name: 'flowise-mcp-client', version: '1.0.0' }, { capabilities: {} })

        let transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport

        if (this.transportType === 'stdio') {
            // Compatible with overridden PATH configuration
            const params = {
                ...this.serverParams,
                env: { ...(this.serverParams.env || {}), PATH: process.env.PATH }
            }
            transport = new StdioClientTransport(params as StdioServerParameters)
            await client.connect(transport)
        } else {
            // SSE/HTTP
            if (this.serverParams.url === undefined) {
                throw new Error('URL is required for SSE/HTTP transport')
            }

            const baseUrl = new URL(this.serverParams.url)
            // Capture serverParams.headers for use in closures, crucial for custom fetch
            const serverHeaders = this.serverParams.headers

            try {
                // Attempt StreamableHTTPClientTransport first
                if (serverHeaders) {
                    // Attempt to pass headers via requestInit, may or may not be respected
                    // by this SDK version for the initial connection handshake.
                    transport = new StreamableHTTPClientTransport(baseUrl, {
                        requestInit: { headers: serverHeaders }
                    })
                } else {
                    transport = new StreamableHTTPClientTransport(baseUrl)
                }
                await client.connect(transport)
            } catch (error1) {
                // Fallback to SSEClientTransport
                console.warn('[MCPToolkit] StreamableHTTPClientTransport failed, falling back to SSE. Error:', error1)
                if (serverHeaders) {
                    // SSEClientTransport header WORKAROUND:
                    // Override the internal fetch used by EventSource (which SSEClientTransport relies on)
                    // to manually inject headers, as EventSource doesn't natively support custom headers
                    // for the initial connection.
                    transport = new SSEClientTransport(baseUrl, {
                        requestInit: { headers: serverHeaders }, // Also try passing here
                        eventSourceInit: {
                            fetch: async (input: Request | URL | string, init?: RequestInit) => {
                                const headers = new Headers(init?.headers || {})
                                if (serverHeaders) {
                                    // Use the captured serverHeaders
                                    Object.entries(serverHeaders).forEach(([key, value]) => {
                                        headers.set(key, value as string)
                                    })
                                }
                                return fetch(input, { ...init, headers })
                            }
                        } as any // Type assertion to allow custom fetch override
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
            // Only initialize once
            const initClient = await this.createClient() // Create a temporary client for initialization

            try {
                this._tools = await initClient.request({ method: 'tools/list' }, ListToolsResultSchema)
                // Process tools using the same client that fetched the list
                this.client = initClient // Temporarily assign to this.client for get_tools
                this.tools = await this.get_tools()
                this.client = null // Clear after use, MCPTool will create its own
            } catch (error) {
                console.error('[MCPToolkit] Error during initialization (tools/list or get_tools):', error)
                await initClient.close() // Ensure client is closed on error
                throw error // Re-throw to be caught by Flowise node
            } finally {
                if (initClient && initClient !== this.client) {
                    // Ensure it's closed if not already handled or nulled
                    await initClient.close()
                }
                // Reset this.client after initialize() so MCPTool always creates a fresh one
                // This also means get_tools() called by listActions will use the initClient.
                // If get_tools called by init() in Flowise node, it uses a fresh client.
                // This logic depends on Flowise's call order. The current structure is:
                // listActions -> Custom_MCP.getTools -> MCPToolkit.initialize -> MCPToolkit.get_tools (uses initClient)
                // Custom_MCP.init -> Custom_MCP.getTools -> MCPToolkit.initialize -> MCPToolkit.get_tools (uses initClient)
            }
        }
    }

    // This get_tools is called by initialize() using the client created there.
    async get_tools(): Promise<Tool[]> {
        if (this._tools === null) {
            throw new Error('Toolkit not initialized or _tools is null.')
        }
        if (!Array.isArray(this._tools?.tools)) {
            console.warn('[MCPToolkit] _tools.tools is not an array or not present.')
            return []
        }
        if (this._tools.tools.length === 0) {
            return []
        }

        const toolsPromises = this._tools.tools.map(async (toolDef: any) => {
            return await MCPTool({
                toolkit: this, // Pass the toolkit instance
                name: toolDef.name,
                description: toolDef.description || '',
                argsSchema: createSchemaModel(toolDef.inputSchema)
            })
        })
        return Promise.all(toolsPromises)
    }
}

// MCPTool now uses the passed toolkit to create a fresh client for each call
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
            const client = await toolkit.createClient() // Create a new client for this specific tool request
            try {
                const req: CallToolRequest = { method: 'tools/call', params: { name: name, arguments: input } }
                const res = await client.request(req, CallToolResultSchema)
                const content = res.content
                return typeof content === 'string' ? content : JSON.stringify(content)
            } catch (toolError) {
                console.error(`[MCPTool: ${name}] Error during request:`, toolError)
                throw toolError // Re-throw to be handled by the calling agent/chain
            } finally {
                await client.close() // Always close the client
            }
        },
        {
            name: name,
            description: description,
            schema: argsSchema
        }
    )
}

// createSchemaModel remains largely the same
function createSchemaModel(
    inputSchema: {
        type: 'object'
        properties?: import('zod').objectOutputType<{}, import('zod').ZodTypeAny, 'passthrough'> | undefined
    } & { [k: string]: unknown }
): any {
    if (typeof inputSchema !== 'object' || inputSchema === null || inputSchema.type !== 'object' || !inputSchema.properties) {
        // If schema is invalid or not an object with properties, fallback to a passthrough schema
        return z.object({}).passthrough()
    }

    const schemaProperties = Object.entries(inputSchema.properties).reduce((acc, [key, _]) => {
        acc[key] = z.any() // Keep it simple, assuming any type for properties
        return acc
    }, {} as Record<string, import('zod').ZodTypeAny>)

    return z.object(schemaProperties)
}
