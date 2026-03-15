import type { Chatflow } from '@flowiseai/common-ui-types'

export type { Chatflow, RequestInterceptor } from '@flowiseai/common-ui-types'

export interface Execution {
    id: string
    executionData: string
    state: string
    agentflowId: string
    sessionId: string
    action?: string
    isPublic?: boolean
    createdDate: string | Date
    updatedDate: string | Date
    stoppedDate: string | Date
    agentflow?: Chatflow
    workspaceId: string
}
