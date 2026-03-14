import { Request, Response } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { z } from 'zod'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { utilBuildChatflow } from '../../utils/buildChatflow'
import { createMockRequest } from '../../utils/mockRequest'
import mcpServerService, { IMcpServerConfig } from './index'
import { ChatFlow } from '../../database/entities/ChatFlow'
import logger from '../../utils/logger'

// Active SSE transport sessions: sessionId → { transport, mcpServer, chatflowId }
interface SseSession {
    transport: SSEServerTransport
    mcpServer: McpServer
    chatflowId: string
}
const sseSessions = new Map<string, SseSession>()

// Maximum concurrent SSE sessions per chatflow (prevents resource exhaustion)
const MAX_SSE_SESSIONS_PER_CHATFLOW = 20

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
 * Build the zod input schema parameters for the tool.
 * For chatflows: always has a mandatory `question` string.
 * For agentflows: has an optional `question` and optional `form` object.
 */
function buildInputSchema(chatflow: ChatFlow) {
    if (chatflow.type === 'MULTIAGENT' || chatflow.type === 'AGENTFLOW') {
        return {
            question: z.string().optional().describe('The question or prompt to send to the agent flow'),
            form: z.record(z.any()).optional().describe('Form inputs for the agent flow')
        }
    }
    // Default: chatflow with a mandatory question
    return {
        question: z.string().describe('The question or prompt to send to the chatflow')
    }
}

/**
 * Callback function for MCP tool execution
 * @return The tool response content, extracted from the utilBuildChatflow result
 */
async function chatflowCallback(
    chatflow: ChatFlow,
    req: Request,
    args: any
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
    const mockReq = createMockRequest({
        chatflowId: chatflow.id,
        body: {
            question: args.question || '',
            ...(args.form ? { form: args.form } : {})
        },
        sourceRequest: req
    })

    const result = await utilBuildChatflow(mockReq, true)

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

    // Register the chatflow as a single MCP tool
    mcpServer.tool(toolName, toolDescription, inputSchema as any, async (args: any) => {
        try {
            return await chatflowCallback(chatflow, req, args)
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
 * Handle GET requests — establish an SSE stream (deprecated MCP transport, protocol version 2024-11-05).
 * Some third-party clients (e.g. n8n) still use this transport.
 *
 * Flow:
 * 1. Client sends GET with Bearer token → server opens SSE stream
 * 2. Server sends `endpoint` event with the POST URL for messages
 * 3. Client POSTs JSON-RPC messages to that URL with ?sessionId=...
 * 4. Server relays responses back over the SSE stream
 */
const handleMcpSseRequest = async (chatflowId: string, token: string, req: Request, res: Response): Promise<void> => {
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

    // Guard: limit concurrent SSE sessions per chatflow
    let sessionCount = 0
    for (const session of sseSessions.values()) {
        if (session.chatflowId === chatflowId) sessionCount++
    }
    if (sessionCount >= MAX_SSE_SESSIONS_PER_CHATFLOW) {
        res.status(429).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Too many active SSE sessions for this chatflow.' },
            id: null
        })
        return
    }

    const toolName = getToolName(config, chatflow)
    const toolDescription = getToolDescription(config, chatflow)
    const inputSchema = buildInputSchema(chatflow)

    // Build the messages endpoint URL that the client should POST to
    const messagesEndpoint = `/api/v1/mcp/chatflow/${chatflowId}/messages`

    // Create SSE transport — it will send an `endpoint` event to the client
    const transport = new SSEServerTransport(messagesEndpoint, res)

    // Create a new MCP server for this SSE session
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

    // Register the chatflow tool (same logic as Streamable HTTP handler)
    mcpServer.tool(toolName, toolDescription, inputSchema as any, async (args: any) => {
        try {
            return await chatflowCallback(chatflow, req, args)
        } catch (error) {
            const errorMessage = getErrorMessage(error)
            logger.error(`[MCP-SSE] Error executing tool ${toolName} for chatflow ${chatflow.id}: ${errorMessage}`)
            return {
                content: [{ type: 'text' as const, text: 'An error occurred while executing the tool. Please try again later.' }],
                isError: true
            }
        }
    })

    // Store session for message routing
    sseSessions.set(transport.sessionId, { transport, mcpServer, chatflowId })
    logger.debug(`[MCP-SSE] Session ${transport.sessionId} opened for chatflow ${chatflowId}`)

    // Clean up when the SSE connection closes
    res.on('close', () => {
        logger.debug(`[MCP-SSE] Session ${transport.sessionId} closed for chatflow ${chatflowId}`)
        sseSessions.delete(transport.sessionId)
        mcpServer.close().catch(() => {})
    })

    // Connect the MCP server to the SSE transport — this calls transport.start()
    // which sends the `endpoint` event to the client
    await mcpServer.connect(transport)
}

/**
 * Handle POST requests to the SSE messages endpoint.
 * Routes incoming JSON-RPC messages to the correct SSE transport by sessionId.
 */
const handleMcpSseMessageRequest = async (
    chatflowId: string,
    token: string,
    sessionId: string,
    req: Request,
    res: Response
): Promise<void> => {
    // Verify auth for the message endpoint too
    try {
        await mcpServerService.getChatflowByIdAndVerifyToken(chatflowId, token)
    } catch (error) {
        if (handleServiceError(error, res)) return
        throw error
    }

    const session = sseSessions.get(sessionId)
    if (!session || session.chatflowId !== chatflowId) {
        res.status(404).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'SSE session not found. Establish a connection via GET first.' },
            id: null
        })
        return
    }

    await session.transport.handlePostMessage(req, res, req.body)
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
    handleMcpSseRequest,
    handleMcpSseMessageRequest,
    handleMcpDeleteRequest
}
