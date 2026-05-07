import type { ComponentCredentialSchema, CreateCredentialBody, Credential } from '@/core/types'

import type { DeduplicatedClient } from './deduplicatedClient'

/**
 * Create credentials API functions bound to a client instance
 */
export function bindCredentialsApi(client: DeduplicatedClient) {
    return {
        /**
         * Get all credentials
         */
        getAllCredentials: async (): Promise<Credential[]> => {
            const response = await client.get('/credentials')
            return response.data
        },

        /**
         * Get credentials filtered by one or more component credential names.
         */
        getCredentialsByName: async (credentialName: string | string[]): Promise<Credential[]> => {
            const response = await client.get('/credentials', { params: { credentialName } })
            return response.data
        },

        /**
         * Fetch the credential schema (field definitions) for a given component credential name.
         */
        getComponentCredentialSchema: async (name: string): Promise<ComponentCredentialSchema> => {
            const response = await client.get(`/components-credentials/${name}`)
            return response.data
        },

        /**
         * Create a new credential.
         */
        createCredential: async (body: CreateCredentialBody): Promise<Credential> => {
            const response = await client.post('/credentials', body)
            client.clearCache()
            return response.data
        },

        /**
         * Get a specific credential by ID (includes plainDataObj for editing).
         */
        getCredentialById: async (id: string): Promise<Credential & { plainDataObj?: Record<string, unknown> }> => {
            const response = await client.get(`/credentials/${id}`)
            return response.data
        },

        /**
         * Update an existing credential.
         */
        updateCredential: async (id: string, body: CreateCredentialBody): Promise<Credential> => {
            const response = await client.put(`/credentials/${id}`, body)
            client.clearCache()
            return response.data
        }
    }
}

export type CredentialsApi = ReturnType<typeof bindCredentialsApi>
