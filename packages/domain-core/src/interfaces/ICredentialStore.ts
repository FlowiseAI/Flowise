/**
 * Credential Interface
 * Represents a stored credential (API key, OAuth token, etc.)
 */
export interface ICredential {
    /** Unique credential identifier */
    id: string

    /** Credential name/label */
    name: string

    /** Type of credential (e.g., 'openai', 'pinecone', 'aws') */
    credentialType: string

    /** Encrypted credential data */
    encryptedData: string

    /** Optional: Tenant ID for multi-tenant scenarios */
    tenantId?: string

    /** Optional: Additional metadata */
    metadata?: Record<string, unknown>
}

/**
 * Credential Store Interface
 *
 * Defines the contract for storing and retrieving credentials.
 * Implementations handle encryption, secure storage, and multi-tenancy.
 *
 * @example
 * ```typescript
 * class MyCredentialStore implements ICredentialStore {
 *   async getCredential(id: string, tenantId?: string): Promise<ICredential> {
 *     return await this.storageClient.get(id, { tenant: tenantId })
 *   }
 * }
 * ```
 */
export interface ICredentialStore {
    /**
     * Retrieve credential by ID
     *
     * @param id - Credential identifier
     * @param tenantId - Optional tenant identifier for multi-tenant scenarios
     * @returns Credential with encrypted data
     * @throws Error if credential not found or access denied
     */
    getCredential(id: string, tenantId?: string): Promise<ICredential>

    /**
     * Store credential
     *
     * @param credential - Credential to store
     * @returns Credential ID
     */
    storeCredential(credential: ICredential): Promise<string>

    /**
     * Optional: Update credential
     *
     * @param id - Credential identifier
     * @param credential - Updated credential data
     */
    updateCredential?(id: string, credential: Partial<ICredential>): Promise<void>

    /**
     * Optional: Delete credential
     *
     * @param id - Credential identifier
     */
    deleteCredential?(id: string): Promise<void>
}
