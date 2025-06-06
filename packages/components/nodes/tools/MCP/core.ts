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

    async createClient(): Promise<Client> {
        const client = new Client({ name: 'flowise-mcp-client', version: '1.0.0' }, { capabilities: {} })
        let transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport

        if (this.transportType === 'stdio') {
            const params = {
                ...this.serverParams,
                env: { ...(this.serverParams.env || {}), PATH: process.env.PATH }
            }
            transport = new StdioClientTransport(params as StdioServerParameters)
            await client.connect(transport)
        } else {
            if (this.serverParams.url === undefined) {
                throw new Error('URL is required for SSE/HTTP transport')
            }

            const baseUrl = new URL(this.serverParams.url)
            const serverHeaders = this.serverParams.headers

            try {
                if (serverHeaders) {
                    transport = new StreamableHTTPClientTransport(baseUrl, {
                        requestInit: { headers: serverHeaders }
                    })
                } else {
                    transport = new StreamableHTTPClientTransport(baseUrl)
                }
                await client.connect(transport)
            } catch (error1) {
                console.warn('[MCPToolkit] StreamableHTTPClientTransport failed, falling back to SSE. Error:', error1)
                if (serverHeaders) {
                    transport = new SSEClientTransport(baseUrl, {
                        requestInit: { headers: serverHeaders },
                        eventSourceInit: {
                            fetch: async (input: Request | URL | string, init?: RequestInit) => {
                                const headers = new Headers(init?.headers || {})
                                if (serverHeaders) {
                                    Object.entries(serverHeaders).forEach(([key, value]) => {
                                        headers.set(key, value as string)
                                    })
                                }
                                return fetch(input, { ...init, headers })
                            }
                        } as any
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
            const initClient = await this.createClient()
            try {
                this._tools = await initClient.request({ method: 'tools/list' }, ListToolsResultSchema)
                this.client = initClient
                this.tools = await this.get_tools()
                this.client = null
            } catch (error) {
                console.error('[MCPToolkit] Error during initialization (tools/list or get_tools):', error)
                if (initClient) await initClient.close()
                throw error
            } finally {
                if (initClient && initClient !== this.client) {
                    await initClient.close()
                }
            }
        }
    }

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
                toolkit: this,
                name: toolDef.name,
                description: toolDef.description || '',
                argsSchema: createSchemaModel(toolDef.inputSchema)
            })
        })
        return Promise.all(toolsPromises)
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
            const client = await toolkit.createClient()
            try {
                const req: CallToolRequest = { method: 'tools/call', params: { name: name, arguments: input } }
                const res = await client.request(req, CallToolResultSchema)
                const content = res.content
                return typeof content === 'string' ? content : JSON.stringify(content)
            } catch (toolError) {
                console.error(`[MCPTool: ${name}] Error during request:`, toolError)
                throw toolError
            } finally {
                if (client) await client.close()
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
    if (typeof inputSchema !== 'object' || inputSchema === null || inputSchema.type !== 'object' || !inputSchema.properties) {
        return z.object({}).passthrough()
    }

    const schemaProperties = Object.entries(inputSchema.properties).reduce((acc, [key, _]) => {
        acc[key] = z.any()
        return acc
    }, {} as Record<string, import('zod').ZodTypeAny>)

    return z.object(schemaProperties)
}
