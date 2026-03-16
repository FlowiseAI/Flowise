import { Execution } from './execution'

export type { Chatflow, RequestInterceptor } from '@flowiseai/common-ui-types'

export interface DeleteResult {
    deletedCount: number
    success: boolean
}

// This is the execution that comes from flowise server
export type ExecutionRaw = Omit<Execution, 'executionData'> & {
    executionData: string
}
