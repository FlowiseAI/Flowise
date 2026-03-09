import type { AxiosInstance } from 'axios'

import type { Tool } from '@/core/types'

/**
 * Create tools API functions bound to a client instance
 */
export function createToolsApi(client: AxiosInstance) {
    return {
        /**
         * Get all available tools
         */
        getAllTools: async (): Promise<Tool[]> => {
            const response = await client.get('/tools')
            return response.data
        },

        /**
         * Get a specific tool by ID
         */
        getToolById: async (id: string): Promise<Tool> => {
            const response = await client.get(`/tools/${encodeURIComponent(id)}`)
            return response.data
        }
    }
}

export type ToolsApi = ReturnType<typeof createToolsApi>
