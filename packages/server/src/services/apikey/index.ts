import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import { ApiKey } from '../../database/entities/ApiKey'
import { LoggedInUser } from '../../enterprise/Interface.Enterprise'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { Platform } from '../../Interface'
import { addChatflowsCount } from '../../utils/addChatflowsCount'
import { generateAPIKey, generateSecretHash } from '../../utils/apiKey'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'

/**
 * Validates that requested permissions are allowed for API keys
 * @param user - The logged-in user
 * @param permissions - string array of requested permissions
 * @param operation - The operation being performed (for error message)
 * @throws InternalFlowiseError if validation fails
 */
function validatePermissions(user: LoggedInUser, requestedPermissions: string[], operation: string) {
    // API Keys should not have workspace or admin permissions
    // This applies to ALL users, including admins (platform constraint)
    const hasRestrictedPermissions = requestedPermissions.some(
        (permission: string) => permission.startsWith('workspace:') || permission.startsWith('admin:')
    )

    if (hasRestrictedPermissions) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Cannot ${operation} API key with workspace or admin permissions`)
    }

    // For Cloud platform, check feature-gated permissions
    // This also applies to ALL users, including admins (platform constraint)
    const appServer = getRunningExpressApp()
    if (appServer.identityManager.getPlatformType() === Platform.CLOUD) {
        if (!user.features) {
            // On Cloud platform, user features should always exist
            // Log the anomaly with context for debugging
            logger.error(
                `[server]: Missing user features on Cloud platform for ${operation} API key. ` +
                    `User: ${user.email || user.id}, ` +
                    `Organization: ${user.activeOrganizationId || 'unknown'}, ` +
                    `Subscription: ${user.activeOrganizationSubscriptionId || 'unknown'}, ` +
                    `Customer: ${user.activeOrganizationCustomerId || 'unknown'}, ` +
                    `Workspace: ${user.activeWorkspaceId || 'unknown'}`
            )
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to validate permissions: user features not available`)
        }

        const featureToPermissionMap: { [key: string]: string[] } = {
            'feat:login-activity': ['loginActivity:'],
            'feat:logs': ['logs:'],
            'feat:roles': ['roles:'],
            'feat:share': ['credentials:share', 'templates:custom-share'],
            'feat:sso-config': ['sso:'],
            'feat:users': ['users:'],
            'feat:workspaces': ['workspace:']
        }

        const disabledFeatures = Object.entries(user.features).filter(([, value]) => value === 'false')
        const disabledPermissionPrefixes: string[] = []
        disabledFeatures.forEach(([featureKey]) => {
            const prefixes = featureToPermissionMap[featureKey]
            if (prefixes) {
                disabledPermissionPrefixes.push(...prefixes)
            }
        })

        const hasDisabledFeaturePermissions = requestedPermissions.some((permission: string) =>
            disabledPermissionPrefixes.some((prefix) => permission.startsWith(prefix))
        )

        if (hasDisabledFeaturePermissions) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Cannot ${operation} API key with permissions for disabled features`)
        }
    }

    // User permission validation - only applies to non-admins (authorization check)
    if (!user.isOrganizationAdmin) {
        // Check if all requested permissions are included in user permissions
        const hasInvalidPermissions = requestedPermissions.some((permission: string) => !user.permissions.includes(permission))
        if (hasInvalidPermissions) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Cannot ${operation} API key with permissions that exceed your own permissions`
            )
        }
    }
}

/**
 * Get all API keys for an organization
 * Returns all API keys across all workspaces in the organization
 */
async function getAllApiKeysByOrganization(organizationId: string): Promise<ApiKey[]> {
    const appServer = getRunningExpressApp()
    const ApiKeys = await appServer.AppDataSource.getRepository(ApiKey)
        .createQueryBuilder('api_key')
        .select(['api_key.keyName', 'api_key.permissions'])
        .leftJoin('workspace', 'workspace', 'api_key.workspaceId = workspace.id')
        .where('workspace.organizationId = :organizationId', { organizationId })
        .getMany()
    return ApiKeys
}

/**
 * Get all API keys for a workspace
 * Non-admin users can only view API keys whose permissions are a subset of their own permissions
 */
const getAllApiKeys = async (user: LoggedInUser, page: number = -1, limit: number = -1) => {
    try {
        const appServer = getRunningExpressApp()
        const queryBuilder = appServer.AppDataSource.getRepository(ApiKey)
            .createQueryBuilder('api_key')
            .orderBy('api_key.updatedDate', 'DESC')
        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }
        queryBuilder.andWhere('api_key.workspaceId = :workspaceId', { workspaceId: user.activeWorkspaceId })
        const allKeys = await queryBuilder.getMany()

        // Filter keys based on user permissions
        let filteredKeys = allKeys
        if (!user.isOrganizationAdmin) {
            // Non-admin users can only see API keys whose permissions are a subset of their own
            filteredKeys = allKeys.filter((key) => {
                // Check if all key permissions are included in user permissions
                return key.permissions.every((permission: string) => user.permissions.includes(permission))
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

const createApiKey = async (user: LoggedInUser, keyName: string, permissions: string[]) => {
    // Validate permissions before creating the key
    validatePermissions(user, permissions, 'create')

    const apiKey = generateAPIKey()
    const apiSecret = generateSecretHash(apiKey)
    const appServer = getRunningExpressApp()
    const newKey = new ApiKey()
    newKey.id = uuidv4()
    newKey.apiKey = apiKey
    newKey.apiSecret = apiSecret
    newKey.keyName = keyName
    newKey.permissions = permissions
    newKey.workspaceId = user.activeWorkspaceId
    const key = appServer.AppDataSource.getRepository(ApiKey).create(newKey)
    await appServer.AppDataSource.getRepository(ApiKey).save(key)
    return await getAllApiKeys(user)
}

// Update api key
const updateApiKey = async (user: LoggedInUser, id: string, keyName: string, permissions: string[]) => {
    // Validate permissions before updating the key
    validatePermissions(user, permissions, 'update')

    const appServer = getRunningExpressApp()
    const currentKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
        id: id,
        workspaceId: user.activeWorkspaceId
    })
    if (!currentKey) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ApiKey ${currentKey} not found`)
    }
    currentKey.keyName = keyName
    currentKey.permissions = permissions
    await appServer.AppDataSource.getRepository(ApiKey).save(currentKey)
    return await getAllApiKeys(user)
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
    getAllApiKeysByOrganization,
    updateApiKey,
    verifyApiKey,
    getApiKey,
    getApiKeyById
}
