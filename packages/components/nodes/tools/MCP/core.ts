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
    async initialize() {
        if (this._tools === null) {
            this.client = new Client(
                {
                    name: 'flowise-client',
                    version: '1.0.0'
                },
                {
                    capabilities: {}
                }
            )
            if (this.transportType === 'stdio') {
                // Compatible with overridden PATH configuration
                this.serverParams.env = {
                    ...(this.serverParams.env || {}),
                    PATH: process.env.PATH
                }

                this.transport = new StdioClientTransport(this.serverParams as StdioServerParameters)
                await this.client.connect(this.transport)
            } else {
                if (this.serverParams.url === undefined) {
                    throw new Error('URL is required for SSE transport')
                }

                const baseUrl = new URL(this.serverParams.url)
                try {
                    this.transport = new StreamableHTTPClientTransport(baseUrl)
                    await this.client.connect(this.transport)
                } catch (error) {
                    this.transport = new SSEClientTransport(baseUrl)
                    await this.client.connect(this.transport)
                }
            }

            this._tools = await this.client.request({ method: 'tools/list' }, ListToolsResultSchema)

            this.tools = await this.get_tools()
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
                client: this.client,
                name: tool.name,
                description: tool.description || '',
                argsSchema: createSchemaModel(tool.inputSchema)
            })
        })
        return Promise.all(toolsPromises)
    }
}

export async function MCPTool({
    client,
    name,
    description,
    argsSchema
}: {
    client: Client
    name: string
    description: string
    argsSchema: any
}): Promise<Tool> {
    return tool(
        async (input): Promise<string> => {
            const req: CallToolRequest = { method: 'tools/call', params: { name: name, arguments: input } }
            const res = await client.request(req, CallToolResultSchema)
            const content = res.content
            const contentString = JSON.stringify(content)
            return contentString
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
