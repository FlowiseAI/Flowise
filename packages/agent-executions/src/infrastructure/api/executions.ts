import type { AxiosInstance } from 'axios'

export const createExecutionsApi = (client: AxiosInstance) => ({
    getAllExecutions: (params: Record<string, unknown> = {}) => client.get('/executions', { params }),
    deleteExecutions: (executionIds: string[]) => client.delete('/executions', { data: { executionIds } }),
    getExecutionById: (executionId: string) => client.get(`/executions/${executionId}`),
    getExecutionByIdPublic: (executionId: string) => client.get(`/public-executions/${executionId}`),
    updateExecution: (executionId: string, body: Record<string, unknown>) => client.put(`/executions/${executionId}`, body)
})

export type ExecutionsApi = ReturnType<typeof createExecutionsApi>
