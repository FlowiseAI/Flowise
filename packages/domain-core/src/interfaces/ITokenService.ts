/**
 * Token Exchange Result
 */
export interface TokenExchangeResult {
    /** Service token for downstream API calls */
    serviceToken: string

    /** Tenant identifier */
    tenantId: string

    /** Optional: Token expiration timestamp */
    expiresAt?: number

    /** Optional: Additional metadata */
    metadata?: Record<string, unknown>
}

/**
 * Token Service Interface
 *
 * Defines the contract for token exchange operations.
 * Used to exchange user/tenant tokens for service tokens that can call downstream APIs.
 *
 * @example
 * ```typescript
 * class MyTokenService implements ITokenService {
 *   async exchangeToken(inputToken: string): Promise<TokenExchangeResult> {
 *     const response = await this.tokenClient.post('/token/exchange', {
 *       token: inputToken
 *     })
 *     return {
 *       serviceToken: response.data.token,
 *       tenantId: response.data.tenantId
 *     }
 *   }
 * }
 * ```
 */
export interface ITokenService {
    /**
     * Exchange input token for service token
     *
     * @param inputToken - Input token from user/tenant context
     * @returns Service token and tenant information
     * @throws Error if exchange fails
     */
    exchangeToken(inputToken: string): Promise<TokenExchangeResult>

    /**
     * Optional: Validate service token
     *
     * @param serviceToken - Service token to validate
     * @returns True if token is valid
     */
    validateToken?(serviceToken: string): Promise<boolean>

    /**
     * Optional: Refresh service token
     *
     * @param serviceToken - Expired or expiring service token
     * @returns New service token
     */
    refreshToken?(serviceToken: string): Promise<string>
}
