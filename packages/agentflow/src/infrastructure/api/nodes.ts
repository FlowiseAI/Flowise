import type { AxiosInstance } from 'axios'

import type { NodeConfigEntry, NodeData, NodeDataSchema } from '@/core/types'

/**
 * Create nodes API functions bound to a client instance
 */
export function bindNodesApi(client: AxiosInstance) {
    return {
        /**
         * Get all available nodes.
         * Component definitions from the server (`inputs` is a schema array).
         * Pass results through initNode() to get canvas-ready NodeData.
         */
        getAllNodes: async (): Promise<NodeDataSchema[]> => {
            const response = await client.get('/nodes')
            return response.data
        },

        /**
         * Get a specific node by name.
         * Single component definition (`inputs` is a schema array).
         */
        getNodeByName: async (name: string): Promise<NodeDataSchema> => {
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
         * Get node configuration (override configs) for a node.
         * Posts the node data to /node-config and returns an array of config entries.
         * NodeData field names (inputParams for schema, inputs for values) already
         * match what the server expects.
         */
        getNodeConfig: async (data: NodeData): Promise<NodeConfigEntry[]> => {
            const response = await client.post('/node-config', data)
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
