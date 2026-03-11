import type { AxiosInstance } from 'axios'

import type { Tool } from '@/core/types'

/**
 * Create tools API functions bound to a client instance
 */
export function bindToolsApi(client: AxiosInstance) {
    return {
        /**
         * Get all available tools
         */
        getAllTools: async (): Promise<Tool[]> => {
            const response = await client.post('/node-load-method/toolAgentflow', { loadMethod: 'listTools' })
            return response.data
        }
    }
}

export type ToolsApi = ReturnType<typeof bindToolsApi>
