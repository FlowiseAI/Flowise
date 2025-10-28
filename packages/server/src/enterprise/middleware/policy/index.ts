import { NextFunction, Request, Response } from 'express'
import { GeneralErrorMessage } from '../../../utils/constants'
import { ErrorMessage } from '../../Interface.Enterprise'
import { RegisteredRoute } from '../../../services/entitled-router'
import { AuthenticationStrategy } from '../../auth/AuthenticationStrategy'

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
        return res.status(401).json({ message: GeneralErrorMessage.UNAUTHORIZED })
    }

    // Organization administrators have unrestricted access to all non-public routes.
    if (user.isOrganizationAdmin) {
        return next()
    }

    // For routes accessible via API key, check the user's entitlements.
    if (user.isApiKeyValidated && policy.authenticationStrategies.includes(AuthenticationStrategy.API_KEY)) {
        const userPermissions = user.permissions || []
        // Check if the user has at least one of the required entitlements for the route.
        const hasPermission = policy.entitlements.some((p) => userPermissions.includes(p))

        if (hasPermission) {
            return next()
        }
    }

    // If none of the above conditions are met, the user is not authorized.
    return res.status(403).json({ message: ErrorMessage.FORBIDDEN })
}
