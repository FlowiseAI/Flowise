import { Execution, ExecutionRaw } from '@/core/types'

export const transformExecution = (data: ExecutionRaw): Execution => {
    const executionDetails = JSON.parse(data.executionData)

    return {
        ...data,
        executionData: executionDetails
    }
}
