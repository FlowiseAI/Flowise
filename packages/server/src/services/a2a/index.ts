import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { utilBuildChatflow } from '../../utils/buildChatflow'
import { ChatType } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import logger from '../../utils/logger'
import {
    A2A_PROTOCOL_VERSION,
    AgentCard,
    AgentSkill,
    JsonRpcRequest,
    JsonRpcResponse,
    Task,
    TaskSendParams,
    TaskGetParams,
    TaskCancelParams,
    Message,
    TextPart
} from './types'

/**
 * Map of active A2A tasks.
 * In production, this should use a persistent store.
 */
const activeTasks = new Map<string, Task>()

/**
 * Map of task IDs to their SSE response objects.
 */
const taskSSEClients = new Map<string, Response>()

/**
 * Sanitize a chatflow name for use as an agent name.
 */
function sanitizeAgentName(name: string): string {
    return name.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Flowise Agent'
}

/**
 * Generate an AgentCard from a chatflow entity.
 */
function generateAgentCard(chatflow: ChatFlow, baseURL: string, protocolVersion: string = A2A_PROTOCOL_VERSION): AgentCard {
    const skills: AgentSkill[] = [
        {
            id: chatflow.id,
            name: sanitizeAgentName(chatflow.name),
            description: chatflow.category || `A Flowise agent powered by ${chatflow.name}`,
            tags: ['flowise', 'agent', chatflow.type || 'CHATFLOW'],
            examples: ['What can you help me with?']
        }
    ]

    return {
        name: sanitizeAgentName(chatflow.name),
        description: chatflow.category || `A Flowise agent powered by chatflow: ${chatflow.name}`,
        url: `${baseURL}/api/v1/a2a/${chatflow.id}`,
        provider: {
            organization: 'FlowiseAI',
            url: 'https://flowiseai.com'
        },
        version: '1.0.0',
        protocolVersion,
        defaultInputModes: ['text/plain'],
        defaultOutputModes: ['text/plain'],
        capabilities: {
            streaming: true
        },
        skills,
        authentication: {
            schemes: ['bearer']
        }
    }
}

/**
 * Extract user message text from A2A message parts.
 */
function extractMessageText(message: Message): string {
    if (!message.parts || message.parts.length === 0) {
        return ''
    }
    const textParts = message.parts
        .filter((part): part is TextPart => part.kind === 'text')
        .map((part) => part.text)
    return textParts.join('\n')
}

/**
 * Convert a Flowise chatflow execution result to A2A artifacts.
 */
function buildArtifactsFromResult(result: any): any[] {
    const artifacts: any[] = []
    if (result?.text) {
        artifacts.push({
            kind: 'artifact',
            artifactId: uuidv4(),
            name: 'response',
            parts: [
                {
                    kind: 'text',
                    text: result.text
                }
            ]
        })
    }
    return artifacts
}

/**
 * Create JSON-RPC error response.
 */
function createErrorResponse(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
    return {
        jsonrpc: '2.0',
        id,
        error: { code, message, data }
    }
}

/**
 * Create JSON-RPC success response.
 */
function createSuccessResponse(id: string | number | null, result: unknown): JsonRpcResponse {
    return {
        jsonrpc: '2.0',
        id,
        result
    }
}

/**
 * Create a mock request object compatible with utilBuildChatflow.
 * This adapts A2A requests to the internal Flowise prediction pipeline.
 */
function createInternalRequest(chatflow: ChatFlow, question: string, chatId: string): Partial<Request> {
    return {
        params: { id: chatflow.id },
        body: {
            question,
            chatId,
            streaming: false
        },
        headers: {},
        get: (headerName: string) => {
            if (headerName === 'flowise-tool') return 'true'
            return undefined
        },
        protocol: 'http',
        user: {
            activeWorkspaceId: chatflow.workspaceId
        }
    } as Partial<Request>
}

/**
 * Handle the A2A AgentCard endpoint.
 * Returns the AgentCard JSON for the specified chatflow.
 */
async function handleAgentCard(chatflowId: string, req: Request, res: Response): Promise<void> {
    try {
        const appServer = getRunningExpressApp()
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })

        if (!chatflow) {
            res.status(StatusCodes.NOT_FOUND).json({
                error: `Agent not found for chatflow: ${chatflowId}`
            })
            return
        }

        const httpProtocol = req.get('x-forwarded-proto') || req.protocol
        const baseURL = `${httpProtocol}://${req.get('host')}`
        const agentCard = generateAgentCard(chatflow, baseURL)

        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.json(agentCard)
    } catch (error) {
        logger.error(`[A2A] Error generating AgentCard for ${chatflowId}: ${getErrorMessage(error)}`)
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: getErrorMessage(error) })
    }
}

/**
 * Handle A2A JSON-RPC requests.
 * Routes to the appropriate method handler based on the `method` field.
 */
async function handleJsonRpc(chatflowId: string, req: Request, res: Response): Promise<void> {
    try {
        const payload = req.body as JsonRpcRequest

        if (!payload || payload.jsonrpc !== '2.0' || !payload.method) {
            const errorResp = createErrorResponse(payload?.id ?? null, -32600, 'Invalid Request: JSON-RPC 2.0 required')
            res.status(StatusCodes.BAD_REQUEST).json(errorResp)
            return
        }

        const appServer = getRunningExpressApp()
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })

        if (!chatflow) {
            const errorResp = createErrorResponse(payload.id, -32001, `Agent not found for chatflow: ${chatflowId}`)
            res.status(StatusCodes.NOT_FOUND).json(errorResp)
            return
        }

        switch (payload.method) {
            case 'tasks/send':
                await handleTaskSend(chatflow, payload, req, res)
                break
            case 'tasks/sendSubscribe':
                await handleTaskSendSubscribe(chatflow, payload, req, res)
                break
            case 'tasks/get':
                await handleTaskGet(chatflow, payload, res)
                break
            case 'tasks/cancel':
                await handleTaskCancel(chatflow, payload, res)
                break
            case 'agent/card':
                // Inline AgentCard response via JSON-RPC
                {
                    const httpProtocol = req.get('x-forwarded-proto') || req.protocol
                    const baseURL = `${httpProtocol}://${req.get('host')}`
                    const agentCard = generateAgentCard(chatflow, baseURL)
                    res.json(createSuccessResponse(payload.id, agentCard))
                }
                break
            default:
                {
                    const errorResp = createErrorResponse(payload.id, -32601, `Method not found: ${payload.method}`)
                    res.status(StatusCodes.NOT_FOUND).json(errorResp)
                }
                break
        }
    } catch (error) {
        logger.error(`[A2A] Error handling JSON-RPC for ${chatflowId}: ${getErrorMessage(error)}`)
        const payload = req.body as JsonRpcRequest
        const errorResp = createErrorResponse(
            payload?.id ?? null,
            -32603,
            'Internal error',
            getErrorMessage(error)
        )
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorResp)
    }
}

/**
 * Handle tasks/send — synchronous task execution.
 * Runs the chatflow and returns the completed Task.
 */
async function handleTaskSend(
    chatflow: ChatFlow,
    payload: JsonRpcRequest,
    req: Request,
    res: Response
): Promise<void> {
    try {
        const params = payload.params as unknown as TaskSendParams
        const taskId = params?.id || uuidv4()
        const question = params?.message ? extractMessageText(params.message) : ''

        if (!question) {
            res.json(createErrorResponse(payload.id, -32602, 'Invalid params: message with text is required'))
            return
        }

        // Create task in submitted state
        const task: Task = {
            kind: 'task',
            id: taskId,
            contextId: params?.contextId,
            status: { state: 'submitted' },
            history: params?.message ? [params.message] : [],
            metadata: params?.metadata || {}
        }
        activeTasks.set(taskId, task)

        // Update to working
        task.status = { state: 'working' }
        activeTasks.set(taskId, { ...task })

        // Execute the chatflow
        const chatId = uuidv4()
        const mockReq = createInternalRequest(chatflow, question, chatId)

        const result = await utilBuildChatflow(mockReq as Request, true, ChatType.INTERNAL)

        // Build response artifacts
        const artifacts = buildArtifactsFromResult(result)

        // Build agent response message
        const responseText = result?.text || JSON.stringify(result || {})
        const agentMessage: Message = {
            kind: 'message',
            messageId: uuidv4(),
            role: 'agent',
            parts: [{ kind: 'text', text: responseText }],
            contextId: params?.contextId,
            taskId
        }

        // Update task to completed
        const history = params?.message ? [params.message] : []
        if (agentMessage.parts && agentMessage.parts.length > 0) {
            history.push(agentMessage)
        }

        task.status = { state: 'completed' }
        task.history = history
        task.artifacts = artifacts
        activeTasks.set(taskId, { ...task })

        const response = createSuccessResponse(payload.id, task)
        res.json(response)
    } catch (error) {
        logger.error(`[A2A] Error in tasks/send: ${getErrorMessage(error)}`)
        const taskId = (payload.params as any)?.id || 'unknown'
        const existingTask = activeTasks.get(taskId)
        if (existingTask) {
            existingTask.status = {
                state: 'failed',
                message: {
                    role: 'agent',
                    parts: [{ kind: 'text', text: getErrorMessage(error) }]
                }
            }
            activeTasks.set(taskId, { ...existingTask })
        }
        res.json(
            createErrorResponse(payload.id, -32000, 'Task execution failed', getErrorMessage(error))
        )
    }
}

/**
 * Handle tasks/sendSubscribe — streaming task execution via SSE.
 */
async function handleTaskSendSubscribe(
    chatflow: ChatFlow,
    payload: JsonRpcRequest,
    req: Request,
    res: Response
): Promise<void> {
    try {
        const params = payload.params as unknown as TaskSendParams
        const taskId = params?.id || uuidv4()
        const question = params?.message ? extractMessageText(params.message) : ''

        if (!question) {
            res.json(createErrorResponse(payload.id, -32602, 'Invalid params: message with text is required'))
            return
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()

        // Create task
        const task: Task = {
            kind: 'task',
            id: taskId,
            contextId: params?.contextId,
            status: { state: 'submitted' },
            history: params?.message ? [params.message] : [],
            metadata: params?.metadata || {}
        }
        activeTasks.set(taskId, task)

        // Send submitted event
        const submittedEvent = createSuccessResponse(payload.id, task)
        res.write(`data: ${JSON.stringify(submittedEvent)}\n\n`)

        // Update to working and send event
        task.status = { state: 'working' }
        activeTasks.set(taskId, { ...task })
        const workingEvent = createSuccessResponse(payload.id, task)
        res.write(`data: ${JSON.stringify(workingEvent)}\n\n`)

        // Execute the chatflow
        const chatId = uuidv4()
        const mockReq = createInternalRequest(chatflow, question, chatId)

        const result = await utilBuildChatflow(mockReq as Request, true, ChatType.INTERNAL)

        // Build response
        const artifacts = buildArtifactsFromResult(result)
        const responseText = result?.text || JSON.stringify(result || {})
        const agentMessage: Message = {
            kind: 'message',
            messageId: uuidv4(),
            role: 'agent',
            parts: [{ kind: 'text', text: responseText }],
            contextId: params?.contextId,
            taskId
        }

        const history = params?.message ? [params.message] : []
        if (agentMessage.parts && agentMessage.parts.length > 0) {
            history.push(agentMessage)
        }

        task.status = { state: 'working' }
        task.artifacts = artifacts

        // Send artifact update
        const artifactEvent = createSuccessResponse(payload.id, task)
        res.write(`data: ${JSON.stringify(artifactEvent)}\n\n`)

        // Complete task
        task.status = { state: 'completed' }
        task.history = history
        activeTasks.set(taskId, { ...task })

        const completedEvent = createSuccessResponse(payload.id, task)
        res.write(`data: ${JSON.stringify(completedEvent)}\n\n`)

        res.end()
    } catch (error) {
        logger.error(`[A2A] Error in tasks/sendSubscribe: ${getErrorMessage(error)}`)
        const taskId = (payload.params as any)?.id || 'unknown'
        const existingTask = activeTasks.get(taskId)
        if (existingTask) {
            existingTask.status = {
                state: 'failed',
                message: {
                    role: 'agent',
                    parts: [{ kind: 'text', text: getErrorMessage(error) }]
                }
            }
            activeTasks.set(taskId, { ...existingTask })
            const failedEvent = createSuccessResponse(payload.id, existingTask)
            res.write(`data: ${JSON.stringify(failedEvent)}\n\n`)
        } else {
            const errorEvent = createErrorResponse(payload.id, -32000, 'Task execution failed', getErrorMessage(error))
            res.write(`data: ${JSON.stringify(errorEvent)}\n\n`)
        }
        res.end()
    }
}

/**
 * Handle tasks/get — retrieve a task by ID.
 */
async function handleTaskGet(
    _chatflow: ChatFlow,
    payload: JsonRpcRequest,
    res: Response
): Promise<void> {
    const params = payload.params as unknown as TaskGetParams
    const taskId = params?.id

    if (!taskId) {
        res.json(createErrorResponse(payload.id, -32602, 'Invalid params: task id is required'))
        return
    }

    const task = activeTasks.get(taskId)
    if (!task) {
        res.json(createErrorResponse(payload.id, -32001, `Task not found: ${taskId}`))
        return
    }

    res.json(createSuccessResponse(payload.id, task))
}

/**
 * Handle tasks/cancel — cancel a running task.
 */
async function handleTaskCancel(
    _chatflow: ChatFlow,
    payload: JsonRpcRequest,
    res: Response
): Promise<void> {
    const params = payload.params as unknown as TaskCancelParams
    const taskId = params?.id

    if (!taskId) {
        res.json(createErrorResponse(payload.id, -32602, 'Invalid params: task id is required'))
        return
    }

    const task = activeTasks.get(taskId)
    if (!task) {
        res.json(createErrorResponse(payload.id, -32001, `Task not found: ${taskId}`))
        return
    }

    // Only cancel if not already in a terminal state
    const terminalStates: string[] = ['completed', 'failed', 'canceled']
    if (!terminalStates.includes(task.status.state)) {
        task.status = { state: 'canceled' }
        activeTasks.set(taskId, { ...task })
    }

    res.json(createSuccessResponse(payload.id, task))
}

export default {
    handleAgentCard,
    handleJsonRpc,

    // Exported for testing
    generateAgentCard,
    extractMessageText,
    buildArtifactsFromResult,
    activeTasks,
    taskSSEClients
}
