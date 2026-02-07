import { IUser } from './IUser'

/**
 * Platform types for authentication resolution
 */
export type Platform = 'OPEN_SOURCE' | 'ENTERPRISE' | 'CLOUD'

/**
 * Authentication resolution result
 */
export interface AuthResolutionResult {
    /** Where to redirect the user */
    redirectUrl: string
    /** Optional additional metadata for the frontend */
    metadata?: Record<string, unknown>
}

/**
 * Authentication Service Interface
 *
 * Defines the contract for authentication and authorization operations.
 * Implementations handle token validation, user lookup, permission checks,
 * and authentication flow resolution.
 *
 * @example
 * ```typescript
 * class MyAuthService implements IAuthService {
 *   async validateToken(token: string): Promise<IUser> {
 *     const payload = jwt.verify(token, this.publicKey)
 *     return await this.userRepository.findById(payload.sub)
 *   }
 * }
 * ```
 */
export interface IAuthService {
    /**
     * Validate authentication token and return user information
     *
     * @param token - JWT or session token to validate
     * @returns User information if token is valid
     * @throws Error if token is invalid or expired
     */
    validateToken(token: string): Promise<IUser>

    /**
     * Check if user has a specific permission
     *
     * @param user - User to check permissions for
     * @param permission - Permission string (e.g., 'agentflows:execute')
     * @returns True if user has the permission
     */
    checkPermission(user: IUser, permission: string): Promise<boolean>

    /**
     * Get all permissions for a user
     *
     * @param userId - User identifier
     * @returns Array of permission strings
     */
    getUserPermissions(userId: string): Promise<string[]>

    /**
     * Optional: Resolve authentication state and determine redirect
     *
     * @param req - Request object (typed as unknown for framework agnosticism)
     * @param res - Response object (typed as unknown for framework agnosticism)
     * @param platform - Platform type (OPEN_SOURCE, ENTERPRISE, CLOUD)
     * @param organizationCount - Number of registered organizations
     * @returns Resolution result, or null to use default behavior
     */
    resolve?(
        req: unknown,
        res: unknown,
        platform: Platform,
        organizationCount: number
    ): Promise<AuthResolutionResult | null>
}
