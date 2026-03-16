import type { AxiosInstance } from 'axios'
import { DeleteResult, Execution, ExecutionFilters, PaginatedResponse } from '@/core/types'
import { transformExecution } from './transformers'

interface ApiResponse<T> {
    data: T
}

export type GetAllExecutionsParams = Omit<Partial<ExecutionFilters>, 'startDate' | 'endDate'> & {
    page: number
    limit: number
    startDate?: string
    endDate?: string
}

export const createExecutionsApi = (client: AxiosInstance) => ({
    getAllExecutions: async (params: GetAllExecutionsParams): Promise<ApiResponse<PaginatedResponse<Execution>>> => {
        const response = await client.get('/executions', { params })
        const transformedResults = response.data.data.map(transformExecution)
        return { data: { data: transformedResults, total: response.data.total } }
    },
    deleteExecutions: async (executionIds: string[]): Promise<ApiResponse<DeleteResult>> => {
        const response = await client.delete('/executions', { data: { executionIds } })
        return { data: response.data }
    },
    getExecutionById: async (executionId: string): Promise<ApiResponse<Execution>> => {
        const response = await client.get(`/executions/${executionId}`)
        return { data: transformExecution(response.data) }
    },
    getExecutionByIdPublic: async (executionId: string): Promise<ApiResponse<Execution>> => {
        const response = await client.get(`/public-executions/${executionId}`)
        return { data: transformExecution(response.data) }
    },
    updateExecution: async (executionId: string, body: { isPublic: boolean }): Promise<ApiResponse<Execution>> => {
        const response = await client.put(`/executions/${executionId}`, body)
        return { data: transformExecution(response.data) }
    }
})

export type ExecutionsApi = ReturnType<typeof createExecutionsApi>
