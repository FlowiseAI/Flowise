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
        getAllTools: async (nodeName = 'toolAgentflow'): Promise<Tool[]> => {
            const response = await client.post(`/node-load-method/${encodeURIComponent(nodeName)}`, { loadMethod: 'listTools' })
            return response.data
        },

        /**
         * Get input argument names for the currently selected tool.
         * Passes current node inputs as `currentNode.inputs` so the server can resolve the selected tool.
         */
        getToolInputArgs: async (inputs: Record<string, unknown>, nodeName = 'toolAgentflow'): Promise<Tool[]> => {
            const response = await client.post(`/node-load-method/${encodeURIComponent(nodeName)}`, {
                loadMethod: 'listToolInputArgs',
                currentNode: { inputs }
            })
            return response.data
        }
    }
}

export type ToolsApi = ReturnType<typeof bindToolsApi>
