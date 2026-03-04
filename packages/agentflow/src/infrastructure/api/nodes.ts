import type { AxiosInstance } from 'axios'

import type { NodeData } from '@/core/types'

/**
 * Create nodes API functions bound to a client instance
 */
export function createNodesApi(client: AxiosInstance) {
    return {
        /**
         * Get all available nodes
         */
        getAllNodes: async (): Promise<NodeData[]> => {
            const response = await client.get('/nodes')
            return response.data
        },

        /**
         * Get a specific node by name
         */
        getNodeByName: async (name: string): Promise<NodeData> => {
            const response = await client.get(`/nodes/${name}`)
            return response.data
        },

        /**
         * Get node icon URL
         */
        getNodeIconUrl: (instanceUrl: string, nodeName: string): string => {
            // Strip trailing slashes so we never get double slashes in the URL.
            const base = instanceUrl.replace(/\/+$/, '')
            return `${base}/api/v1/node-icon/${nodeName}`
        }
    }
}

export type NodesApi = ReturnType<typeof createNodesApi>
