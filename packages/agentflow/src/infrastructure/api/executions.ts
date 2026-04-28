import type { AxiosInstance } from 'axios'

import type { Execution } from '@/core/types'

export function bindExecutionsApi(client: AxiosInstance) {
    return {
        getAllExecutions: async (params?: { chatflowId?: string }): Promise<Execution[]> => {
            const response = await client.get<Execution[]>('/executions', { params })
            return response.data
        },

        getExecutionById: async (executionId: string): Promise<Execution> => {
            const response = await client.get<Execution>(`/executions/${executionId}`)
            return response.data
        },

        getExecutionByIdPublic: async (executionId: string): Promise<Execution> => {
            const response = await client.get<Execution>(`/public-executions/${executionId}`)
            return response.data
        },

        deleteExecutions: async (executionIds: string[]): Promise<void> => {
            await client.delete('/executions', { data: { executionIds } })
        },

        updateExecution: async (executionId: string, payload: Partial<Pick<Execution, 'status'>>): Promise<Execution> => {
            const response = await client.put<Execution>(`/executions/${executionId}`, payload)
            return response.data
        }
    }
}

export type ExecutionsApi = ReturnType<typeof bindExecutionsApi>
