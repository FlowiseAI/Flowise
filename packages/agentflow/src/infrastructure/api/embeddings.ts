import type { AxiosInstance } from 'axios'

import type { NodeOption } from '@/core/types'

/**
 * Create embeddings API functions bound to a client instance
 */
export function bindEmbeddingsApi(client: AxiosInstance) {
    return {
        /**
         * Get all available embedding models
         */
        getEmbeddings: async (): Promise<NodeOption[]> => {
            const response = await client.post('/node-load-method/agentAgentflow', { loadMethod: 'listEmbeddings' })
            return response.data
        }
    }
}

export type EmbeddingsApi = ReturnType<typeof bindEmbeddingsApi>
