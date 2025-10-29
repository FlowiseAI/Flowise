import { NextFunction, Response } from 'express'
import { RegisteredRoute } from '../../../services/entitled-router'
import { AuthenticationStrategy } from '../../auth/AuthenticationStrategy'
import { StatusCodes } from 'http-status-codes'

/**
 * Authorizes a user against a specific policy.
 *
 * @param {any} user - The user object attached to the request, if any.
 * @param {RegisteredRoute} policy - The matching policy for the current request.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the stack.
 */
export const authorize = (user: any, policy: RegisteredRoute, res: Response, next: NextFunction) => {
    // If the route is public, grant access immediately.
    if (policy.authenticationStrategies.includes(AuthenticationStrategy.PUBLIC)) {
        return next()
    }

    // If the route is not public, a user must be authenticated.
    if (!user) {
        return res.status(401).json({ message: StatusCodes.FORBIDDEN })
    }

    //+Existing logic.  Eventually API Keys and JWT clients should be scoped & have permissions checked too
    if (user.isApiKeyValidated || user.isOrganizationAdmin) {
        return next()
    }
    //-Existing Logic

    const userPermissions = user.permissions || []
    // Check if the user has at least one of the required entitlements for the route.
    const hasPermission = policy.entitlements.some((p) => userPermissions.includes(p))

    if (hasPermission) {
        return next()
    }

    // If none of the above conditions are met, the user is not authorized.
    return res.status(403).json({ message: StatusCodes.UNAUTHORIZED })
}
