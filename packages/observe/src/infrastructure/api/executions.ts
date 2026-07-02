import type { AxiosInstance } from 'axios'

import type { Execution, ExecutionListParams, ExecutionListResponse } from '@/core/types'

export function createExecutionsApi(client: AxiosInstance) {
    return {
        /**
         * List executions with optional filters and pagination.
         * Pass `agentflowIds` to scope to one or more agentflows. Omit (or pass
         * an empty array) for the full cross-agent list.
         */
        getAllExecutions: async (params: ExecutionListParams): Promise<ExecutionListResponse> => {
            const query: Record<string, unknown> = {
                page: params.page,
                limit: params.limit
            }
            if (params.state) query.state = params.state
            if (params.agentflowIds && params.agentflowIds.length > 0) {
                // Server expects a single `agentflowId` query value: one id, or
                // multiple ids comma-joined (e.g. `agentflowId=a,b`). UUIDs can't
                // contain commas, so the join is unambiguous.
                const ids = params.agentflowIds.filter(Boolean)
                if (ids.length > 0) query.agentflowId = ids.join(',')
            }
            if (params.agentflowName) query.agentflowName = params.agentflowName
            if (params.sessionId) query.sessionId = params.sessionId
            if (params.startDate) query.startDate = params.startDate.toISOString()
            if (params.endDate) query.endDate = params.endDate.toISOString()

            const response = await client.get<ExecutionListResponse>('/executions', { params: query })
            return response.data
        },

        getExecutionById: async (executionId: string): Promise<Execution> => {
            const response = await client.get<Execution>(`/executions/${executionId}`)
            return response.data
        },

        deleteExecutions: async (executionIds: string[]): Promise<void> => {
            await client.delete('/executions', { data: { executionIds } })
        },

        updateExecution: async (executionId: string, payload: { isPublic: boolean }): Promise<Execution> => {
            const response = await client.put<Execution>(`/executions/${executionId}`, payload)
            return response.data
        }
    }
}

export type ExecutionsApi = ReturnType<typeof createExecutionsApi>
