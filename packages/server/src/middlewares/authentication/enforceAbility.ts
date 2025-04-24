import { Request, Response, NextFunction } from 'express'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { EntityTarget, IsNull, Like } from 'typeorm'
import path from 'path'

// Define interfaces for better type safety
interface UserInfo {
    id: string
    roles: string[]
    organizationId: string
}

interface ResourceFilter {
    userId?: string
    organizationId: string
}

interface ResourceWithVisibility {
    id: string
    userId: string
    organizationId: string
    visibility: string | string[]
}

// Cache for imported entities
const entityCache: Record<string, EntityTarget<any>> = {}

/**
 * Middleware to enforce access control based on user roles and resource ownership.
 *
 * Permission Hierarchy:
 * 1. Admin: Has full access to all resources within their organization.
 * 2. Regular User: Has access only to resources they own within their organization.
 *
 * @param resourceName The name of the resource being accessed (e.g., 'ChatFlow', 'Assistant')
 */
const enforceAbility = (resourceName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Skip auth check for non-authenticated routes
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const user = req.user as UserInfo
        const isAdmin = Boolean(user.roles?.includes('Admin'))

        // Set up filter based on user role
        const filter = createAccessFilter(user, isAdmin)

        // Store the filter for use in subsequent middleware or controllers
        res.locals.filter = filter
        try {
            // Only check resource access for requests with an ID parameter
            if (isResourceIdRequest(req)) {
                await verifyResourceAccess(resourceName, req.params.id, filter, isAdmin)
            }
            next()
        } catch (error) {
            handleResourceAccessError(error, res)
        }
    }
}

/**
 * Determines if the request requires resource ID verification
 */
function isResourceIdRequest(req: Request): boolean {
    const { method, params } = req
    return (method === 'GET' && Boolean(params.id)) || (['PUT', 'DELETE'].includes(method) && Boolean(params.id))
}

/**
 * Creates an access filter based on user role
 */
function createAccessFilter(user: UserInfo, isAdmin: boolean): ResourceFilter {
    const filter: ResourceFilter = { organizationId: user.organizationId }
    filter.userId = user.id
    return filter
}

/**
 * Verifies resource access permissions
 */
async function verifyResourceAccess(resourceName: string, resourceId: string, filter: ResourceFilter, isAdmin: boolean): Promise<void> {
    if (!resourceId) {
        throw new Error('Resource ID not provided')
    }

    // Early exit for admin with organization-only filter
    if (isAdmin && Object.keys(filter).length === 1 && filter.organizationId) {
        // Admin only needs to check organization, which will be done in checkResourceAccess
        // No need for additional checks here
    }

    await checkResourceAccess(resourceName, resourceId, filter, isAdmin)
}

/**
 * Check if the user has access to a specific resource.
 * This enforces the permission hierarchy by using the filter.
 */
async function checkResourceAccess(resourceName: string, resourceId: string, filter: ResourceFilter, isAdmin: boolean): Promise<void> {
    const appServer = getRunningExpressApp()
    const Entity = await getEntityFromCache(resourceName)
    const repository = appServer.AppDataSource.getRepository(Entity)

    let hasAccess = false

    if (isAdmin) {
        // Admin can access any resource within their organization
        hasAccess = await adminHasAccess(repository, resourceId, filter.organizationId)
    } else {
        // Regular user access check
        hasAccess = await regularUserHasAccess(repository, resourceId, filter)
    }

    if (!hasAccess) {
        throw new Error('Forbidden: You do not have access to this resource')
    }
}

/**
 * Check if a regular user has access to a resource, including visibility rules
 */
async function regularUserHasAccess(repository: any, resourceId: string, filter: ResourceFilter): Promise<boolean> {
    // First check if resource exists at all (for correct error behavior)
    const resource = await repository.findOne({
        where: { id: resourceId },
        select: ['id', 'userId', 'organizationId', 'visibility']
    })

    if (!resource) {
        throw new Error('Resource not found')
    }

    // Direct ownership check (original behavior)
    const hasDirectAccess =
        (await repository.findOne({
            where: { id: resourceId, ...filter }
        })) !== null

    // If has direct access or resource doesn't have visibility field
    if (hasDirectAccess || !('visibility' in resource)) {
        return hasDirectAccess
    }

    // Check organization-level visibility
    return checkOrganizationVisibility(resource, filter.organizationId)
}

/**
 * Check if a resource has organization-level visibility
 */
function checkOrganizationVisibility(resource: ResourceWithVisibility, organizationId: string): boolean {
    // Get visibility values (maintaining original behavior)
    const visibilityValues = Array.isArray(resource.visibility)
        ? resource.visibility
        : resource.visibility.split(',').map((v: string) => v.trim())

    // Original check (organization visibility + same organization)
    return visibilityValues.includes('Organization') && resource.organizationId === organizationId
}

/**
 * Check if admin has access to a resource
 */
async function adminHasAccess(repository: any, resourceId: string, organizationId: string): Promise<boolean> {
    // Use more efficient query but maintain original behavior
    return (
        (await repository.findOne({
            where: {
                id: resourceId,
                organizationId
            },
            select: ['id'] // Only need to check existence
        })) !== null
    )
}

/**
 * Retrieve the entity class from cache or import it if not cached.
 * This improves performance by avoiding repeated imports.
 */
async function getEntityFromCache(resourceName: string): Promise<EntityTarget<any>> {
    // Fast path - check cache first
    if (entityCache[resourceName]) {
        return entityCache[resourceName]
    }

    try {
        // Use path.resolve for better cross-platform compatibility
        const modulePath = path.resolve(__dirname, '..', '..', 'database', 'entities', `${resourceName}.js`)

        // Dynamic import with error handling
        const module = await import(modulePath)
        const Entity = module[resourceName]

        if (!Entity) {
            throw new Error(`Unknown resource: ${resourceName}`)
        }

        // Cache the entity for future use
        entityCache[resourceName] = Entity
        return Entity
    } catch (error) {
        // Improve error message to help with debugging
        throw new Error(`Failed to load entity ${resourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

/**
 * Handle errors that occur during resource access checks.
 * This provides appropriate HTTP responses based on the error type.
 */
function handleResourceAccessError(error: any, res: Response): Response {
    console.error('Error checking resource access:', error)

    if (error instanceof Error) {
        if (error.message.includes('Resource ID not provided')) {
            return res.status(400).json({ error: error.message })
        }
        if (error.message.includes('Unknown resource')) {
            return res.status(400).json({ error: error.message })
        }
        if (error.message.includes('Forbidden')) {
            return res.status(403).json({ error: error.message })
        }
        if (error.message.includes('Resource not found')) {
            return res.status(404).json({ error: error.message })
        }
    }

    return res.status(500).json({ error: 'Internal server error' })
}

export default enforceAbility
