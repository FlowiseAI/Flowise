import type { AxiosInstance } from 'axios'

import type { NodeOption } from '@/core/types'

/**
 * Create runtime state API functions bound to a client instance
 */
export function bindRuntimeStateApi(client: AxiosInstance) {
    return {
        /**
         * Get all available runtime state keys
         */
        getRuntimeStateKeys: async (): Promise<NodeOption[]> => {
            const response = await client.post('/node-load-method/agentAgentflow', { loadMethod: 'listRuntimeStateKeys' })
            return response.data
        }
    }
}

export type RuntimeStateApi = ReturnType<typeof bindRuntimeStateApi>
