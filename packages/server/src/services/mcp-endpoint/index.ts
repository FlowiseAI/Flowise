import { Request, Response } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod/v3'
import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { utilBuildChatflow } from '../../utils/buildChatflow'
import { createMockRequest } from '../../utils/mockRequest'
import mcpServerService from '../mcp-server/index'
import { ChatFlow } from '../../database/entities/ChatFlow'
import logger from '../../utils/logger'
import { ChatType, IMcpServerConfig, IReactFlowObject } from '../../Interface'

/**
 * Build the MCP tool name from config + chatflow
 */
function getToolName(config: IMcpServerConfig, chatflow: ChatFlow): string {
    if (config.toolName) return config.toolName
    // Sanitize the chatflow name to be a valid tool identifier
    return (
        chatflow.name
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 64) || 'chatflow_tool'
    )
}

/**
 * Build the MCP tool description from config + chatflow
 */
function getToolDescription(config: IMcpServerConfig, chatflow: ChatFlow): string {
    if (config.description) return config.description
    return `Execute the "${chatflow.name}" flow`
}

/**
 * Determine the tool input type based on the chatflow type and flowData.
 * For AGENTFLOW, we look for a `startAgentflow` node and check its `startInputType` property.
 * If it's `formInput`, we return 'form', otherwise 'question'.
 * For other flow types, we default to 'question'.
 */
function getToolInputType(chatflow: ChatFlow): 'question' | 'form' {
    if (chatflow.type === 'AGENTFLOW') {
        try {
            const flowData: IReactFlowObject = JSON.parse(chatflow.flowData)
            const nodes = flowData.nodes || []
            const startNode = nodes.find((node) => node.data.name === 'startAgentflow')
            const startInputType = startNode?.data?.inputs?.startInputType as 'chatInput' | 'formInput'
            return startInputType === 'formInput' ? 'form' : 'question'
        } catch (error) {
            logger.error(`Failed to parse flowData for chatflow ${chatflow.id}: ${getErrorMessage(error)}`)
            return 'question'
        }
    }
    return 'question'
}

/**
 * Build the zod input schema parameters for the tool.
 * For chatflows: always has a mandatory `question` string.
 * For agentflows: only allow one of `question` or `form` (object)
 */
function buildInputSchema(chatflow: ChatFlow) {
    const inputType = getToolInputType(chatflow)
    if (inputType === 'form') {
        return buildFormInputSchema(chatflow)
    }
    return {
        question: z.string().describe('The question or prompt to send to the chatflow')
    }
}

/**
 * Build the zod schema for form input, based on the `startAgentflow` node configuration.
 * 
 * Example input:
 * ```json
    {
        "inputs": {
            "startInputType": "formInput",
            "formInputTypes": [
                {
                    "type": "string",
                    "label": "Name",
                    "name": "name",
                    "addOptions": ""
                },
                {
                    "type": "number",
                    "label": "Age",
                    "name": "age",
                    "addOptions": ""
                },
                {
                    "type": "boolean",
                    "label": "Adult",
                    "name": "is_adult",
                    "addOptions": ""
                },
                {
                    "type": "options",
                    "label": "Favorite Drink",
                    "name": "favorite_drink",
                    "addOptions": [
                        {
                            "option": "Tea"
                        },
                        {
                            "option": "Coffee"
                        }
                    ]
                }
            ]
        }    
    }
    ```
 */
function buildFormInputSchema(chatflow: ChatFlow) {
    try {
        const flowData: IReactFlowObject = JSON.parse(chatflow.flowData)
        const nodes = flowData.nodes || []
        const startNode = nodes.find((node) => node.data.name === 'startAgentflow')
        const formInputTypes = startNode?.data?.inputs?.formInputTypes as
            | {
                  type: string
                  label: string
                  name: string
                  addOptions: { option: string }[]
              }[]
            | undefined

        if (!formInputTypes || !Array.isArray(formInputTypes)) {
            throw new Error('Invalid form input configuration in chatflow')
        }
        const schemaShape: Record<string, z.ZodTypeAny> = {}
        formInputTypes.forEach((input) => {
            switch (input.type) {
                case 'string':
                    schemaShape[input.name] = z.string().describe(input.label)
                    break
                case 'number':
                    schemaShape[input.name] = z.number().describe(input.label)
                    break
                case 'boolean':
                    schemaShape[input.name] = z.boolean().describe(input.label)
                    break
                case 'options': {
                    if (!Array.isArray(input.addOptions) || input.addOptions.length === 0) {
                        break
                    }
                    const options = input.addOptions
                        .map((opt: { option?: unknown }) => opt?.option)
                        .filter((option): option is string => typeof option === 'string' && option.length > 0)

                    if (options.length === 0) {
                        break
                    }

                    schemaShape[input.name] = z.enum(options as [string, ...string[]]).describe(input.label)
                    break
                }
                default:
                    throw new Error(`Unsupported form input type: ${input.type}`)
            }
        })
        return {
            form: z.object(schemaShape).describe('Form inputs for the agent flow')
        }
    } catch (error) {
        logger.error(`Failed to build form input schema for chatflow ${chatflow.id}: ${getErrorMessage(error)}`)
        // Fallback to a generic schema if there's an error
        throw new Error('Failed to build form input schema due to invalid configuration')
    }
}

/**
 * Callback function for MCP tool execution
 * @return The tool response content, extracted from the utilBuildChatflow result
 */
async function chatflowCallback(
    chatflow: ChatFlow,
    chatId: string,
    req: Request,
    args: any
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
    const inputType = getToolInputType(chatflow)
    const body = inputType === 'form' ? { form: args.form || {} } : { question: args.question || '' }
    const mockReq = createMockRequest({
        chatflowId: chatflow.id,
        body: {
            ...body,
            chatId
        },
        sourceRequest: req
    })

    const result = await utilBuildChatflow(mockReq, true, ChatType.MCP)

    // Extract the text response from the result
    let textContent: string
    if (typeof result === 'string') {
        textContent = result
    } else if (result?.text) {
        textContent = result.text
    } else if (result?.json) {
        textContent = JSON.stringify(result.json)
    } else {
        textContent = JSON.stringify(result)
    }

    return {
        content: [{ type: 'text' as const, text: textContent }]
    }
}

/**
 * Handle an InternalFlowiseError from getChatflowByIdAndVerifyToken.
 * Writes the appropriate JSON-RPC error response and returns true if handled.
 * Returns false for unrecognised errors so the caller can rethrow.
 */
function handleServiceError(error: unknown, res: Response): boolean {
    if (error instanceof InternalFlowiseError) {
        if (error.statusCode === StatusCodes.UNAUTHORIZED) {
            res.status(401).json({
                jsonrpc: '2.0',
                error: { code: -32001, message: 'Unauthorized' },
                id: null
            })
            return true
        }
        if (error.statusCode === StatusCodes.NOT_FOUND) {
            res.status(404).json({
                jsonrpc: '2.0',
                error: { code: -32001, message: 'MCP server not found' },
                id: null
            })
            return true
        }
    }
    return false
}

/**
 * Handle an MCP protocol request (POST) for a given chatflowId + token.
 * Uses the MCP SDK in stateless mode (no session management).
 * The token is verified against the stored config (constant-time comparison).
 */
const handleMcpRequest = async (chatflowId: string, token: string, req: Request, res: Response): Promise<void> => {
    let chatflow: ChatFlow
    let config: IMcpServerConfig | null

    try {
        chatflow = await mcpServerService.getChatflowByIdAndVerifyToken(chatflowId, token)
        config = mcpServerService.parseMcpConfig(chatflow)
    } catch (error) {
        if (handleServiceError(error, res)) return
        throw error
    }

    if (!config || !config.enabled) {
        res.status(404).json({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'MCP server not found' },
            id: null
        })
        return
    }

    const toolName = getToolName(config, chatflow)
    const toolDescription = getToolDescription(config, chatflow)
    const inputSchema = buildInputSchema(chatflow)

    // Create a stateless MCP server for this request
    const mcpServer = new McpServer(
        {
            name: `flowise-${toolName}`,
            version: '1.0.0'
        },
        {
            capabilities: {
                tools: {}
            }
        }
    )

    mcpServer.tool(toolName, toolDescription, inputSchema as any, async (args: any) => {
        try {
            const chatId = uuidv4() // Generate a unique chat ID for this execution
            return await chatflowCallback(chatflow, chatId, req, args)
        } catch (error) {
            const errorMessage = getErrorMessage(error)
            logger.error(`[MCP] Error executing tool ${toolName} for chatflow ${chatflow.id}: ${errorMessage}`)
            return {
                content: [{ type: 'text' as const, text: 'An error occurred while executing the tool. Please try again later.' }],
                isError: true
            }
        }
    })

    // Create a stateless transport (no session management)
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined
    })

    // Connect server to transport
    await mcpServer.connect(transport)

    // Clean up when the HTTP response finishes.
    // NOTE: We must NOT close the server immediately after handleRequest() because
    // the transport's handlePostRequest() fires onmessage() without awaiting it.
    // If we close() too early, the SSE response stream is terminated before the
    // McpServer has finished processing the request and writing its JSON-RPC response.
    res.on('close', () => {
        mcpServer.close().catch(() => {})
    })

    // Handle the incoming request.
    // The transport handles POST (JSON-RPC), GET (SSE), and DELETE (session).
    await transport.handleRequest(req, res, req.body)
}

/**
 * Handle DELETE requests for session termination (stateless mode rejects with 405)
 */
const handleMcpDeleteRequest = async (chatflowId: string, req: Request, res: Response): Promise<void> => {
    // In stateless mode, DELETE is not applicable
    res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Session termination is not supported in stateless mode.' },
        id: null
    })
}

export default {
    handleMcpRequest,
    handleMcpDeleteRequest
}
