import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import { ApiKey } from '../../database/entities/ApiKey'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { addChatflowsCount } from '../../utils/addChatflowsCount'
import { generateAPIKey, generateSecretHash } from '../../utils/apiKey'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'

/**
 * Validates that requested permissions do not exceed user's own permissions
 * @param userPermissions - Array of permissions the user has
 * @param isOrganizationAdmin - Whether the user is an organization admin
 * @param permissions - JSON string of requested permissions
 * @param operation - The operation being performed (for error message)
 * @throws InternalFlowiseError if validation fails
 */
function validatePermissions(userPermissions: string[], isOrganizationAdmin: boolean, permissions: string, operation: string) {
    if (!isOrganizationAdmin) {
        const requestedPermissions = JSON.parse(permissions)
        // Check if all requested permissions are included in user permissions
        const hasInvalidPermissions = requestedPermissions.some(
            (permission: string) => permission !== null && !userPermissions.includes(permission)
        )
        if (hasInvalidPermissions) {
            throw new InternalFlowiseError(
                StatusCodes.FORBIDDEN,
                `Cannot ${operation} API key with permissions that exceed your own permissions`
            )
        }
    }
}

/**
 * Get all API keys for a workspace
 * Non-admin users can only view API keys whose permissions are a subset of their own permissions
 */
const getAllApiKeys = async (
    userPermissions: string[],
    isOrganizationAdmin: boolean,
    workspaceId: string,
    page: number = -1,
    limit: number = -1
) => {
    try {
        const appServer = getRunningExpressApp()
        const queryBuilder = appServer.AppDataSource.getRepository(ApiKey)
            .createQueryBuilder('api_key')
            .orderBy('api_key.updatedDate', 'DESC')
        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }
        queryBuilder.andWhere('api_key.workspaceId = :workspaceId', { workspaceId })
        const allKeys = await queryBuilder.getMany()

        // Filter keys based on user permissions
        let filteredKeys = allKeys
        if (!isOrganizationAdmin) {
            // Non-admin users can only see API keys whose permissions are a subset of their own
            filteredKeys = allKeys.filter((key) => {
                try {
                    const keyPermissions = JSON.parse(key.permissions)
                    // Check if all key permissions are included in user permissions
                    return keyPermissions.every((permission: string) => permission === null || userPermissions.includes(permission))
                } catch (error) {
                    // Log parsing errors to help with debugging malformed permissions
                    logger.error(
                        `[server]: Failed to parse permissions for API key ${key.id} (${key.keyName}). Raw value: ${key.permissions}`,
                        error
                    )
                    // If parsing fails, exclude this key
                    return false
                }
            })
        }

        const keysWithChatflows = await addChatflowsCount(filteredKeys)

        if (page > 0 && limit > 0) {
            return { total: filteredKeys.length, data: keysWithChatflows }
        } else {
            return keysWithChatflows
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.getAllApiKeys - ${getErrorMessage(error)}`)
    }
}

const getApiKey = async (apiKey: string) => {
    try {
        const appServer = getRunningExpressApp()
        const currentKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
            apiKey: apiKey
        })
        if (!currentKey) {
            return undefined
        }
        return currentKey
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.getApiKey - ${getErrorMessage(error)}`)
    }
}

const getApiKeyById = async (apiKeyId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const currentKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
            id: apiKeyId
        })
        if (!currentKey) {
            return undefined
        }
        return currentKey
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.getApiKeyById - ${getErrorMessage(error)}`)
    }
}

const createApiKey = async (
    userPermissions: string[],
    isOrganizationAdmin: boolean,
    workspaceId: string,
    keyName: string,
    permissions: string
) => {
    // Validate permissions before creating the key
    validatePermissions(userPermissions, isOrganizationAdmin, permissions, 'create')

    const apiKey = generateAPIKey()
    const apiSecret = generateSecretHash(apiKey)
    const appServer = getRunningExpressApp()
    const newKey = new ApiKey()
    newKey.id = uuidv4()
    newKey.apiKey = apiKey
    newKey.apiSecret = apiSecret
    newKey.keyName = keyName
    newKey.permissions = permissions
    newKey.workspaceId = workspaceId
    const key = appServer.AppDataSource.getRepository(ApiKey).create(newKey)
    await appServer.AppDataSource.getRepository(ApiKey).save(key)
    return await getAllApiKeys(userPermissions, isOrganizationAdmin, workspaceId)
}

// Update api key
const updateApiKey = async (
    userPermissions: string[],
    isOrganizationAdmin: boolean,
    workspaceId: string,
    id: string,
    keyName: string,
    permissions: string
) => {
    // Validate permissions before updating the key
    validatePermissions(userPermissions, isOrganizationAdmin, permissions, 'update')

    const appServer = getRunningExpressApp()
    const currentKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
        id: id,
        workspaceId: workspaceId
    })
    if (!currentKey) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ApiKey ${currentKey} not found`)
    }
    currentKey.keyName = keyName
    currentKey.permissions = permissions
    await appServer.AppDataSource.getRepository(ApiKey).save(currentKey)
    return await getAllApiKeys(userPermissions, isOrganizationAdmin, workspaceId)
}

const deleteApiKey = async (id: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ApiKey).delete({ id, workspaceId })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ApiKey ${id} not found`)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.deleteApiKey - ${getErrorMessage(error)}`)
    }
}

const verifyApiKey = async (paramApiKey: string): Promise<string> => {
    try {
        const appServer = getRunningExpressApp()
        const apiKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
            apiKey: paramApiKey
        })
        if (!apiKey) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }
        return 'OK'
    } catch (error) {
        if (error instanceof InternalFlowiseError && error.statusCode === StatusCodes.UNAUTHORIZED) {
            throw error
        } else {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Error: apikeyService.verifyApiKey - ${getErrorMessage(error)}`
            )
        }
    }
}

export default {
    createApiKey,
    deleteApiKey,
    getAllApiKeys,
    updateApiKey,
    verifyApiKey,
    getApiKey,
    getApiKeyById
}
