import type { AxiosInstance } from 'axios'

import type { ChatModel } from '@/core/types'

/**
 * Create models API functions bound to a client instance
 */
export function bindChatModelsApi(client: AxiosInstance) {
    return {
        /**
         * Get all available chat models
         */
        getChatModels: async (): Promise<ChatModel[]> => {
            const response = await client.get('/assistants/components/chatmodels')
            return response.data
        },

        /**
         * Get chat models filtered by provider
         */
        getModelsByProvider: async (provider: string): Promise<ChatModel[]> => {
            const response = await client.get('/assistants/components/chatmodels', { params: { provider } })
            return response.data
        }
    }
}

export type ChatModelsApi = ReturnType<typeof bindChatModelsApi>
