import type { AxiosInstance } from 'axios'

import type { Chatflow, FlowData } from '@/core/types'

/**
 * Create chatflows API functions bound to a client instance
 */
export function createChatflowsApi(client: AxiosInstance) {
    return {
        /**
         * Get all chatflows
         */
        getAllChatflows: async (): Promise<Chatflow[]> => {
            const response = await client.get('/chatflows')
            return response.data
        },

        /**
         * Get a specific chatflow by ID
         */
        getChatflow: async (id: string): Promise<Chatflow> => {
            const response = await client.get(`/chatflows/${id}`)
            return response.data
        },

        /**
         * Create a new chatflow
         */
        createChatflow: async (data: { name: string; flowData: FlowData | string; type?: string }): Promise<Chatflow> => {
            const flowData = typeof data.flowData === 'string' ? data.flowData : JSON.stringify(data.flowData)

            const response = await client.post('/chatflows', {
                name: data.name,
                flowData,
                type: data.type || 'AGENTFLOW'
            })
            return response.data
        },

        /**
         * Update an existing chatflow
         */
        updateChatflow: async (
            id: string,
            data: Partial<{
                name: string
                flowData: FlowData | string
                deployed: boolean
                isPublic: boolean
                chatbotConfig: string
            }>
        ): Promise<Chatflow> => {
            const updateData = { ...data }
            if (data.flowData && typeof data.flowData !== 'string') {
                updateData.flowData = JSON.stringify(data.flowData)
            }

            const response = await client.put(`/chatflows/${id}`, updateData)
            return response.data
        },

        /**
         * Delete a chatflow
         */
        deleteChatflow: async (id: string): Promise<void> => {
            await client.delete(`/chatflows/${id}`)
        },

        /**
         * Generate an agentflow using AI
         */
        generateAgentflow: async (data: {
            question: string
            selectedChatModel: Record<string, unknown>
        }): Promise<{
            nodes: FlowData['nodes']
            edges: FlowData['edges']
        }> => {
            const response = await client.post('/agentflowv2-generator/generate', data)
            return response.data
        },

        /**
         * Get available chat models for generation
         */
        getChatModels: async (): Promise<
            Array<{
                name: string
                label: string
                description?: string
                category?: string
                inputParams?: Array<{
                    name: string
                    label: string
                    type: string
                    optional?: boolean
                    default?: unknown
                }>
            }>
        > => {
            const response = await client.get('/assistants/chatmodels')
            return response.data
        }
    }
}

export type ChatflowsApi = ReturnType<typeof createChatflowsApi>
