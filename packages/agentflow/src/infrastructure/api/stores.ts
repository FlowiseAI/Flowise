import type { AxiosInstance } from 'axios'

import type { NodeOption } from '@/core/types'

/**
 * Create stores API functions bound to a client instance
 */
export function bindStoresApi(client: AxiosInstance) {
    return {
        /**
         * Get all available document stores
         */
        getStores: async (): Promise<NodeOption[]> => {
            const response = await client.post('/node-load-method/agentAgentflow', { loadMethod: 'listStores' })
            return response.data
        },

        /**
         * Get all available vector stores
         */
        getVectorStores: async (): Promise<NodeOption[]> => {
            const response = await client.post('/node-load-method/agentAgentflow', { loadMethod: 'listVectorStores' })
            return response.data
        }
    }
}

export type StoresApi = ReturnType<typeof bindStoresApi>
