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
            const response = await client.post('/node-load-method/agentAgentflow', { loadMethod: 'listModels' })
            return response.data
        }
    }
}

export type ChatModelsApi = ReturnType<typeof bindChatModelsApi>
