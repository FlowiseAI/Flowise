import { Request, Response, NextFunction } from 'express'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { EntityTarget } from 'typeorm'
import path from 'path'

// Cache for imported entities
const entityCache: { [key: string]: EntityTarget<any> } = {}

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
        // Ensure user is authenticated
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { id: userId, roles: userRoles = [], organizationId } = req.user
        const isAdmin = userRoles.includes('Admin')
        console.log('isAdmin', { isAdmin, userRoles, organizationId, userId, user: req.user })
        // Set up filter based on user role
        let filter: any = { organizationId }
        if (!isAdmin) {
            // Regular users can only access their own resources
            filter.userId = userId
        }

        // Store the filter for use in subsequent middleware or controllers
        res.locals.filter = filter

        // For GET requests
        if (req.method === 'GET') {
            if (req.params.id) {
                // If it's a GET request for a single item (ID provided)
                try {
                    await checkResourceAccess(resourceName, req.params.id, filter, isAdmin)
                } catch (error) {
                    return handleResourceAccessError(error, res)
                }
            }
            // For GET requests without an ID (list requests), we don't need additional checks
            // The filter will be applied in the controller/service
            return next()
        }

        // For PUT and DELETE requests, check resource ownership
        if (['PUT', 'DELETE'].includes(req.method)) {
            const resourceId = req.params.id
            if (!resourceId) {
                return res.status(400).json({ error: 'Resource ID not provided' })
            }

            try {
                // Verify that the user has access to the specific resource
                await checkResourceAccess(resourceName, resourceId, filter, isAdmin)
            } catch (error) {
                return handleResourceAccessError(error, res)
            }
        }

        next()
    }
}

/**
 * Check if the user has access to a specific resource.
 * This enforces the permission hierarchy by using the filter.
 */
async function checkResourceAccess(resourceName: string, resourceId: string, filter: any, isAdmin: boolean) {
    const appServer = getRunningExpressApp()
    const Entity = await getEntityFromCache(resourceName)
    const repository = appServer.AppDataSource.getRepository(Entity)

    let resourceExists
    if (isAdmin) {
        // Admin can access any resource within their organization
        resourceExists = await repository.findOne({ where: { id: resourceId, organizationId: filter.organizationId } })
    } else {
        // Regular users can only access their own resources
        resourceExists = await repository.findOne({ where: { id: resourceId, ...filter } })
    }

    if (!resourceExists) {
        throw new Error('Forbidden: You do not have access to this resource')
    }
}

/**
 * Retrieve the entity class from cache or import it if not cached.
 * This improves performance by avoiding repeated imports.
 */
async function getEntityFromCache(resourceName: string): Promise<EntityTarget<any>> {
    if (entityCache[resourceName]) {
        return entityCache[resourceName]
    }

    const modulePath = path.join(__dirname, '..', '..', 'database', 'entities', `${resourceName}.js`)
    const Entity = await import(modulePath).then((module) => module[resourceName])

    if (!Entity) {
        throw new Error(`Unknown resource: ${resourceName}`)
    }

    entityCache[resourceName] = Entity
    return Entity
}

/**
 * Handle errors that occur during resource access checks.
 * This provides appropriate HTTP responses based on the error type.
 */
function handleResourceAccessError(error: any, res: Response) {
    console.error('Error checking resource access:', error)
    if (error instanceof Error && error.message.includes('Unknown resource')) {
        return res.status(400).json({ error: error.message })
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
        return res.status(403).json({ error: error.message })
    }
    return res.status(500).json({ error: 'Internal server error' })
}

export default enforceAbility
