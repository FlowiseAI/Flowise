import type { AxiosInstance } from 'axios'

import type { Model } from '@/core/types'

/**
 * Create models API functions bound to a client instance
 */
export function createModelsApi(client: AxiosInstance) {
    return {
        /**
         * Get all available chat models
         */
        getChatModels: async (): Promise<Model[]> => {
            const response = await client.get('/assistants/chatmodels')
            return response.data
        },

        /**
         * Get chat models filtered by provider
         */
        getModelsByProvider: async (provider: string): Promise<Model[]> => {
            const response = await client.get(`/assistants/chatmodels?provider=${provider}`)
            return response.data
        }
    }
}

export type ModelsApi = ReturnType<typeof createModelsApi>
