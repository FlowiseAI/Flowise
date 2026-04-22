import { StatusCodes } from 'http-status-codes'
import { CustomMcpServer } from '../../database/entities/CustomMcpServer'
import { CustomMcpServerAuthType, CustomMcpServerStatus, ICustomMcpServerResponse } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { encryptCredentialData, decryptCredentialData } from '../../utils'
import { MCPToolkit, checkDenyList, isValidURL, validateCustomHeaders } from 'flowise-components'
import { getAppVersion } from '../../utils'
import logger from '../../utils/logger'
import { FLOWISE_COUNTER_STATUS, FLOWISE_METRIC_COUNTERS } from '../../Interface.Metrics'

const REDACTED_VALUE = '************'
const DEFAULT_TOOLS_MAX_BYTES = 512 * 1024
const DEFAULT_AUTHORIZE_TIMEOUT_MS = 15_000
const MIN_AUTHORIZE_TIMEOUT_MS = 1_000

const getToolsMaxBytes = (): number => {
    const raw = process.env.CUSTOM_MCP_TOOLS_MAX_BYTES
    if (raw === undefined || raw === '') return DEFAULT_TOOLS_MAX_BYTES
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return DEFAULT_TOOLS_MAX_BYTES
    return parsed
}

const getAuthorizeTimeoutMs = (): number => {
    const raw = process.env.CUSTOM_MCP_AUTHORIZE_TIMEOUT_MS
    if (raw === undefined || raw === '') return DEFAULT_AUTHORIZE_TIMEOUT_MS
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed < MIN_AUTHORIZE_TIMEOUT_MS) return DEFAULT_AUTHORIZE_TIMEOUT_MS
    return parsed
}

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timer: NodeJS.Timeout
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms)
    })
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>
}

const toBadRequest = async (fn: () => Promise<void> | void, fallbackMessage: string): Promise<void> => {
    try {
        await fn()
    } catch (err) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, fallbackMessage)
    }
}

const assertSafeServerUrl = async (url: string): Promise<void> => {
    if (!isValidURL(url)) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Invalid Server URL: "${url}" is not a valid URL`)
    }
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new InternalFlowiseError(
            StatusCodes.BAD_REQUEST,
            `Invalid Server URL: only http and https are allowed, got "${parsed.protocol.replace(':', '')}"`
        )
    }
    // Runs the shared HTTP deny-list check (RFC1918, loopback, link-local, IMDS, ...)
    // with opt-out via HTTP_SECURITY_CHECK=false and allowlist via HTTP_DENY_LIST env.
    await toBadRequest(() => checkDenyList(url), 'Server URL is not allowed by policy')
}

const assertValidHeaders = (headers: unknown): void => {
    if (!headers || typeof headers !== 'object') return
    try {
        validateCustomHeaders(headers as Record<string, string>)
    } catch (err) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, getErrorMessage(err))
    }
}

/**
 * Returns only the origin + '/**' to avoid leaking token-bearing path segments
 * e.g. https://api.test-server.com/mcp/server/w5pqFCYcsp6TAzaJ → https://api.test-server.com/********
 */
const maskServerUrl = (url: string): string => {
    try {
        const parsed = new URL(url)
        if (parsed.pathname && parsed.pathname !== '/') {
            return `${parsed.origin}/${REDACTED_VALUE}`
        }
        return parsed.origin
    } catch {
        return REDACTED_VALUE
    }
}

const sanitizeCustomMcpServer = ({ authConfig: _authConfig, ...rest }: CustomMcpServer) => ({
    ...rest,
    serverUrl: maskServerUrl(rest.serverUrl)
})

const createCustomMcpServer = async (requestBody: any, orgId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const newRecord = new CustomMcpServer()
        if (requestBody.serverUrl) await assertSafeServerUrl(requestBody.serverUrl)

        // Encrypt authConfig if present
        if (requestBody.authConfig && typeof requestBody.authConfig === 'object') {
            if (requestBody.authType === CustomMcpServerAuthType.CUSTOM_HEADERS) {
                assertValidHeaders((requestBody.authConfig as Record<string, any>).headers)
            }
            requestBody.authConfig = await encryptCredentialData(requestBody.authConfig)
        } else {
            requestBody.authConfig = null // explicitly set to null to avoid saving non-decrypted values or empty objects/strings in the database
        }
        Object.assign(newRecord, requestBody)

        const record = appServer.AppDataSource.getRepository(CustomMcpServer).create(newRecord)
        const dbResponse = await appServer.AppDataSource.getRepository(CustomMcpServer).save(record)
        await appServer.telemetry.sendTelemetry(
            'custom_mcp_server_created',
            {
                version: await getAppVersion(),
                toolId: dbResponse.id,
                toolName: dbResponse.name
            },
            orgId
        )
        appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.CUSTOM_MCP_SERVER_CREATED, {
            status: FLOWISE_COUNTER_STATUS.SUCCESS
        })
        return sanitizeCustomMcpServer(dbResponse)
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: customMcpServersService.createCustomMcpServer - ${getErrorMessage(error)}`
        )
    }
}

const getAllCustomMcpServers = async (workspaceId: string, page: number = -1, limit: number = -1) => {
    try {
        const appServer = getRunningExpressApp()
        const queryBuilder = appServer.AppDataSource.getRepository(CustomMcpServer)
            .createQueryBuilder('custom_mcp_server')
            .orderBy('custom_mcp_server.updatedDate', 'DESC')

        queryBuilder.andWhere('custom_mcp_server.workspaceId = :workspaceId', { workspaceId })
        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }

        const [data, total] = await queryBuilder.getManyAndCount()

        const sanitized = data.map(sanitizeCustomMcpServer)

        if (page > 0 && limit > 0) {
            return { data: sanitized, total }
        } else {
            return sanitized
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: customMcpServersService.getAllCustomMcpServers - ${getErrorMessage(error)}`
        )
    }
}

const getCustomMcpServerById = async (id: string, workspaceId: string): Promise<ICustomMcpServerResponse> => {
    try {
        const appServer = getRunningExpressApp()
        // Explicitly select `tools` — it is `select: false` on the entity so list queries stay cheap.
        const dbResponse = await appServer.AppDataSource.getRepository(CustomMcpServer)
            .createQueryBuilder('custom_mcp_server')
            .addSelect('custom_mcp_server.tools')
            .where('custom_mcp_server.id = :id', { id })
            .andWhere('custom_mcp_server.workspaceId = :workspaceId', { workspaceId })
            .getOne()
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Custom MCP server ${id} not found`)
        }
        const result: ICustomMcpServerResponse = { ...dbResponse, authConfig: undefined, serverUrl: maskServerUrl(dbResponse.serverUrl) }
        if (dbResponse.authConfig) {
            try {
                const decrypted = await decryptCredentialData(dbResponse.authConfig)
                if (decrypted && typeof decrypted === 'object') {
                    // Mask sensitive header values — only expose keys
                    const masked = { ...decrypted } as Record<string, any>
                    if (masked.headers && typeof masked.headers === 'object') {
                        const redactedHeaders: Record<string, string> = {}
                        for (const key of Object.keys(masked.headers)) {
                            redactedHeaders[key] = REDACTED_VALUE
                        }
                        masked.headers = redactedHeaders
                    }
                    result.authConfig = masked
                } else {
                    result.authConfig = {}
                }
            } catch {
                result.authConfig = {}
            }
        }
        return result
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: customMcpServersService.getCustomMcpServerById - ${getErrorMessage(error)}`
        )
    }
}

const updateCustomMcpServer = async (id: string, requestBody: any, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const record = await appServer.AppDataSource.getRepository(CustomMcpServer).findOneBy({
            id,
            workspaceId
        })
        if (!record) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Custom MCP server ${id} not found`)
        }

        if (requestBody.serverUrl === maskServerUrl(record.serverUrl)) {
            requestBody.serverUrl = record.serverUrl
        } else if (requestBody.serverUrl && requestBody.serverUrl.includes(REDACTED_VALUE)) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                'Server URL still contains the masked placeholder. Send the full URL, or omit serverUrl from the request to keep the existing value.'
            )
        } else if (requestBody.serverUrl) {
            await assertSafeServerUrl(requestBody.serverUrl)
        }

        // Merge authConfig: clear it when switching to no authentication; otherwise preserve
        // existing encrypted header values when client sends redacted placeholders
        if (requestBody.authType === CustomMcpServerAuthType.NONE) {
            requestBody.authConfig = null
        } else if (requestBody.authConfig && typeof requestBody.authConfig === 'object') {
            if (requestBody.authConfig.headers && typeof requestBody.authConfig.headers === 'object' && record.authConfig) {
                try {
                    const existingDecrypted = await decryptCredentialData(record.authConfig)
                    if (existingDecrypted?.headers && typeof existingDecrypted.headers === 'object') {
                        const mergedHeaders: Record<string, string> = {}
                        for (const [key, value] of Object.entries(requestBody.authConfig.headers as Record<string, string>)) {
                            // Keep existing value if client sent the redacted placeholder
                            if (value === REDACTED_VALUE && key in (existingDecrypted.headers as Record<string, string>)) {
                                mergedHeaders[key] = (existingDecrypted.headers as Record<string, string>)[key]
                            } else if (typeof value === 'string' && value !== REDACTED_VALUE && value.includes(REDACTED_VALUE)) {
                                throw new InternalFlowiseError(
                                    StatusCodes.BAD_REQUEST,
                                    `Header "${key}" value still contains the masked placeholder. Send the full value, or pass "${REDACTED_VALUE}" to keep the existing value.`
                                )
                            } else {
                                mergedHeaders[key] = value
                            }
                        }
                        requestBody.authConfig = { ...requestBody.authConfig, headers: mergedHeaders }
                    }
                } catch (err) {
                    if (err instanceof InternalFlowiseError) throw err
                }
            }
            if (requestBody.authType === CustomMcpServerAuthType.CUSTOM_HEADERS) {
                assertValidHeaders((requestBody.authConfig as Record<string, any>).headers)
            }
            requestBody.authConfig = await encryptCredentialData(requestBody.authConfig)
        }

        const updateRecord = new CustomMcpServer()
        Object.assign(updateRecord, requestBody)
        appServer.AppDataSource.getRepository(CustomMcpServer).merge(record, updateRecord)
        record.workspaceId = workspaceId // defense-in-depth
        const dbResponse = await appServer.AppDataSource.getRepository(CustomMcpServer).save(record)
        return sanitizeCustomMcpServer(dbResponse)
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: customMcpServersService.updateCustomMcpServer - ${getErrorMessage(error)}`
        )
    }
}

const deleteCustomMcpServer = async (id: string, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(CustomMcpServer).delete({
            id,
            workspaceId
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: customMcpServersService.deleteCustomMcpServer - ${getErrorMessage(error)}`
        )
    }
}

const authorizeCustomMcpServer = async (id: string, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(CustomMcpServer)
        const record = await repo.findOneBy({ id, workspaceId })
        if (!record) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Custom MCP server ${id} not found`)
        }

        // Build headers from decrypted authConfig — only when authType explicitly requires them
        let headers: Record<string, string> = {}
        if (record.authType === CustomMcpServerAuthType.CUSTOM_HEADERS && record.authConfig) {
            try {
                const decrypted = await decryptCredentialData(record.authConfig)
                if (decrypted && typeof decrypted === 'object') {
                    // Support CUSTOM_HEADERS format: { headers: { key: value } }
                    if (decrypted.headers && typeof decrypted.headers === 'object') {
                        headers = decrypted.headers as Record<string, string>
                    }
                }
            } catch {
                // authConfig decryption failed — proceed without headers
            }
        }

        const serverParams: any = {
            url: record.serverUrl,
            ...(Object.keys(headers).length > 0 ? { headers } : {})
        }

        let toolkit: MCPToolkit | null = null
        try {
            toolkit = new MCPToolkit(serverParams, 'sse')
            const timeoutMs = getAuthorizeTimeoutMs()
            await withTimeout(toolkit.initialize(), timeoutMs, `MCP server handshake exceeded ${timeoutMs}ms`)

            const discoveredTools = toolkit._tools || []
            const toolsJson = JSON.stringify(discoveredTools)

            const maxBytes = getToolsMaxBytes()
            if (maxBytes > 0 && Buffer.byteLength(toolsJson, 'utf8') > maxBytes) {
                record.status = CustomMcpServerStatus.ERROR
                await repo.save(record)
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    `MCP server returned a tools payload larger than the allowed limit (${maxBytes} bytes). Set CUSTOM_MCP_TOOLS_MAX_BYTES to override.`
                )
            }

            const toolsArray = Array.isArray((discoveredTools as any)?.tools) ? (discoveredTools as any).tools : []
            record.tools = toolsJson
            record.toolCount = toolsArray.length
            record.status = CustomMcpServerStatus.AUTHORIZED
            await repo.save(record)

            logger.debug(`[CustomMcpServerService]: Authorized Custom MCP server ${id}, discovered ${toolsArray.length} tools`)

            // Ensure tools is present in the response even if `select:false` stripped it from the saved entity.
            return { ...sanitizeCustomMcpServer(record), tools: toolsJson }
        } catch (connectError) {
            // InternalFlowiseError (e.g. oversized tools payload) was already persisted — rethrow as-is
            if (connectError instanceof InternalFlowiseError) throw connectError
            record.status = CustomMcpServerStatus.ERROR
            await repo.save(record)
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Failed to connect to Custom MCP server: ${getErrorMessage(connectError)}`
            )
        } finally {
            if (toolkit?.client) {
                try {
                    await toolkit.client.close()
                } catch {
                    // ignore cleanup errors
                }
            }
        }
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: customMcpServersService.authorizeCustomMcpServer - ${getErrorMessage(error)}`
        )
    }
}

const getDiscoveredTools = async (id: string, workspaceId: string): Promise<Record<string, any>[]> => {
    try {
        const appServer = getRunningExpressApp()
        const record = await appServer.AppDataSource.getRepository(CustomMcpServer)
            .createQueryBuilder('custom_mcp_server')
            .addSelect('custom_mcp_server.tools')
            .where('custom_mcp_server.id = :id', { id })
            .andWhere('custom_mcp_server.workspaceId = :workspaceId', { workspaceId })
            .getOne()
        if (!record) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Custom MCP server ${id} not found`)
        }
        if (!record.tools) {
            return []
        }
        try {
            const parsed = JSON.parse(record.tools)
            return Array.isArray(parsed?.tools) ? parsed.tools : []
        } catch {
            return []
        }
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: customMcpServersService.getDiscoveredTools - ${getErrorMessage(error)}`
        )
    }
}

export default {
    createCustomMcpServer,
    getAllCustomMcpServers,
    getCustomMcpServerById,
    updateCustomMcpServer,
    deleteCustomMcpServer,
    authorizeCustomMcpServer,
    getDiscoveredTools
}
