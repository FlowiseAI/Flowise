// ============================================================================
// API Types
// ============================================================================

export type { Chatflow, RequestInterceptor } from '@flowiseai/common-ui-types'

export interface ApiResponse<T> {
    data: T
    status: number
}

export interface NodeOption {
    label: string
    name: string
    description?: string
    imageSrc?: string
}

export type ChatModel = NodeOption

export type Tool = NodeOption

export interface Credential {
    id: string
    name: string
    credentialName: string
    createdDate?: string
    updatedDate?: string
    workspaceID?: string
}
