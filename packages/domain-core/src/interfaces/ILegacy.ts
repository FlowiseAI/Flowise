/**
 * Legacy Interfaces
 *
 * These interfaces are kept for backward compatibility.
 * New code should use the modern interfaces instead.
 */

/**
 * @deprecated Use IAuthService instead
 * Authentication Provider Interface - Legacy interface for backward compatibility
 */
export interface IAuthProvider {
    /**
     * Initialize the authentication provider
     */
    initialize(): Promise<void>

    /**
     * Authenticate a user
     * @param credentials - User credentials
     * @returns Authentication result with user information
     */
    authenticate(credentials: unknown): Promise<{
        user: unknown
        token?: string
    }>

    /**
     * Verify an authentication token
     * @param token - Authentication token
     * @returns User information if token is valid
     */
    verifyToken(token: string): Promise<unknown | null>
}
