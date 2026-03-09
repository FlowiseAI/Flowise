import type { AxiosInstance } from 'axios'

import type { Credential } from '@/core/types'

/**
 * Create credentials API functions bound to a client instance
 */
export function createCredentialsApi(client: AxiosInstance) {
    return {
        /**
         * Get all credentials
         */
        getAllCredentials: async (): Promise<Credential[]> => {
            const response = await client.get('/credentials')
            return response.data
        },

        /**
         * Get credentials filtered by component credential name
         */
        getCredentialsByName: async (credentialName: string): Promise<Credential[]> => {
            const response = await client.get(`/credentials?credentialName=${credentialName}`)
            return response.data
        }
    }
}

export type CredentialsApi = ReturnType<typeof createCredentialsApi>
