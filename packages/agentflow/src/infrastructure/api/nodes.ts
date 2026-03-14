import type { AxiosInstance } from 'axios'

import type { NodeData } from '@/core/types'

/**
 * Create nodes API functions bound to a client instance
 */
export function bindNodesApi(client: AxiosInstance) {
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
         * Call a loadMethod on a specific node (e.g. listRegions on awsChatBedrock).
         * Maps to POST /node-load-method/{nodeName} with { loadMethod, ...body }.
         */
        loadNodeMethod: async (nodeName: string, loadMethod: string, body?: Record<string, unknown>): Promise<unknown> => {
            const response = await client.post(`/node-load-method/${nodeName}`, { loadMethod, ...body })
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

export type NodesApi = ReturnType<typeof bindNodesApi>
