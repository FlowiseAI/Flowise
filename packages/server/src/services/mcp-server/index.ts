import { StatusCodes } from 'http-status-codes'
import crypto from 'crypto'
import { z } from 'zod/v3'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { IMcpServerConfig } from '../../Interface'

const toolNameSchema = z
    .string()
    .min(1, 'toolName is required')
    .max(64, 'toolName must be 64 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'toolName must contain only alphanumeric characters, underscores, and hyphens')

const createConfigSchema = z.object({
    toolName: toolNameSchema,
    description: z.string().min(1, 'description is required')
})

const updateConfigSchema = z.object({
    toolName: toolNameSchema.optional(),
    description: z.string().min(1, 'description cannot be empty').optional(),
    enabled: z.boolean().optional()
})

function validateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data)
    if (!result.success) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, result.error.errors[0].message)
    }
    return result.data
}

/**
 * Generate a random 32-char hex token (128 bits of entropy)
 */
function generateToken(): string {
    return crypto.randomBytes(16).toString('hex')
}

/**
 * Parse the mcpServerConfig JSON string from a ChatFlow entity
 */
function parseMcpConfig(chatflow: ChatFlow): IMcpServerConfig | null {
    if (!chatflow.mcpServerConfig) return null
    try {
        return JSON.parse(chatflow.mcpServerConfig) as IMcpServerConfig
    } catch {
        return null
    }
}

/**
 * Get MCP server config for a chatflow
 */
const getMcpServerConfig = async (chatflowId: string, workspaceId: string): Promise<IMcpServerConfig> => {
    try {
        const appServer = getRunningExpressApp()
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: { id: chatflowId, workspaceId }
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }
        const config = parseMcpConfig(chatflow)
        return config || { enabled: false, token: '', description: '', toolName: '' }
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: mcpServerService.getMcpServerConfig - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Enable MCP server for a chatflow — generates a token and saves config
 */
const createMcpServerConfig = async (
    chatflowId: string,
    workspaceId: string,
    body: { description: string; toolName: string }
): Promise<IMcpServerConfig> => {
    try {
        const appServer = getRunningExpressApp()
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: { id: chatflowId, workspaceId }
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        // If already has an MCP config, return it
        const existing = parseMcpConfig(chatflow)
        if (existing && existing.enabled) {
            return existing
        }

        validateWithZod(createConfigSchema, body)

        const config: IMcpServerConfig = {
            enabled: true,
            token: generateToken(),
            description: body.description,
            toolName: body.toolName
        }

        chatflow.mcpServerConfig = JSON.stringify(config)
        await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)

        return config
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: mcpServerService.createMcpServerConfig - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Update MCP server config (description, toolName, enabled/disabled)
 */
const updateMcpServerConfig = async (
    chatflowId: string,
    workspaceId: string,
    body: { description?: string; toolName?: string; enabled?: boolean }
): Promise<IMcpServerConfig> => {
    try {
        const appServer = getRunningExpressApp()
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: { id: chatflowId, workspaceId }
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        const existing = parseMcpConfig(chatflow)
        if (!existing) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `MCP server config not found for ID: ${chatflowId}`)
        }

        validateWithZod(updateConfigSchema, body)

        if (body.description !== undefined) existing.description = body.description
        if (body.toolName !== undefined) existing.toolName = body.toolName
        if (body.enabled !== undefined) existing.enabled = body.enabled

        chatflow.mcpServerConfig = JSON.stringify(existing)
        await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)

        return existing
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: mcpServerService.updateMcpServerConfig - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Disable (soft delete) MCP server config
 */
const deleteMcpServerConfig = async (chatflowId: string, workspaceId: string): Promise<void> => {
    try {
        const appServer = getRunningExpressApp()
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: { id: chatflowId, workspaceId }
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        const existing = parseMcpConfig(chatflow)
        if (!existing) return

        existing.enabled = false
        chatflow.mcpServerConfig = JSON.stringify(existing)
        await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: mcpServerService.deleteMcpServerConfig - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Rotate (regenerate) the token
 */
const refreshMcpToken = async (chatflowId: string, workspaceId: string): Promise<IMcpServerConfig> => {
    try {
        const appServer = getRunningExpressApp()
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: { id: chatflowId, workspaceId }
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        const existing = parseMcpConfig(chatflow)
        if (!existing) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `MCP server config not found for ID: ${chatflowId}`)
        }

        existing.token = generateToken()
        chatflow.mcpServerConfig = JSON.stringify(existing)
        await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)

        return existing
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: mcpServerService.refreshMcpToken - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Look up a chatflow by ID and verify the MCP token (constant-time comparison).
 */
const getChatflowByIdAndVerifyToken = async (chatflowId: string, token: string): Promise<ChatFlow> => {
    try {
        const appServer = getRunningExpressApp()
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: { id: chatflowId }
        })

        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'MCP server not found')
        }

        const config = parseMcpConfig(chatflow)
        if (!config || !config.enabled || !config.token) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'MCP server not found')
        }

        // Constant-time comparison to prevent timing attacks
        const storedBuffer = Buffer.from(config.token, 'utf8')
        const providedBuffer = Buffer.from(token, 'utf8')
        if (storedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(storedBuffer, providedBuffer)) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Invalid token')
        }

        return chatflow
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: mcpServerService.getChatflowByIdAndVerifyToken - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getMcpServerConfig,
    createMcpServerConfig,
    updateMcpServerConfig,
    deleteMcpServerConfig,
    refreshMcpToken,
    getChatflowByIdAndVerifyToken,
    parseMcpConfig
}
