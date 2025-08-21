/**
 * MCP OAuth Metadata Utility (Server-side)
 *
 * Server-side version of MCP metadata fetching with caching
 */

export interface MCPOAuthMetadata {
    issuer: string
    authorization_endpoint: string
    token_endpoint: string
    registration_endpoint: string
    [key: string]: any
}

// Simple in-memory cache for metadata
const metadataCache = new Map<
    string,
    {
        data: MCPOAuthMetadata
        expires: number
    }
>()

// Cache duration: 30 minutes
const CACHE_DURATION = 30 * 60 * 1000

/**
 * Fetches MCP OAuth metadata from the well-known endpoint
 * Uses caching to avoid repeated requests
 */
export async function fetchMCPMetadata(baseUrl: string = 'https://mcp.atlassian.com'): Promise<MCPOAuthMetadata> {
    const metadataUrl = `${baseUrl}/.well-known/oauth-authorization-server`
    const cacheKey = metadataUrl

    // Check cache first
    const cached = metadataCache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
        return cached.data
    }

    try {
        const response = await fetch(metadataUrl)

        if (!response.ok) {
            throw new Error(`Failed to fetch MCP OAuth metadata: ${response.status} ${response.statusText}`)
        }

        const metadata = (await response.json()) as MCPOAuthMetadata

        // Validate required fields
        if (!metadata.token_endpoint || !metadata.authorization_endpoint) {
            throw new Error('Invalid MCP OAuth metadata: missing required endpoints')
        }

        // Cache the metadata
        metadataCache.set(cacheKey, {
            data: metadata,
            expires: Date.now() + CACHE_DURATION
        })

        return metadata
    } catch (error) {
        console.error('Error fetching MCP OAuth metadata:', error)

        // If we have expired cached data, return it as fallback
        if (cached) {
            return cached.data
        }

        throw error
    }
}

/**
 * Helper function to check if a credential is using MCP OAuth
 * Based on presence of mcp_client_id and mcp_client_secret
 */
export function isMCPCredential(credentialData: any): boolean {
    return !!(credentialData?.mcp_client_id && credentialData?.mcp_client_secret)
}
