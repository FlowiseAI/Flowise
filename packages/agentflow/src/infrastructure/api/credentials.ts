import type { AxiosInstance } from 'axios'

import type { Credential } from '@/core/types'

/**
 * Create credentials API functions bound to a client instance
 */
export function bindCredentialsApi(client: AxiosInstance) {
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
        }
    }
}

export type CredentialsApi = ReturnType<typeof bindCredentialsApi>
