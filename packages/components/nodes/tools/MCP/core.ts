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
