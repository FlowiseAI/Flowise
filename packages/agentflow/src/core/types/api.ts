// ============================================================================
// API Types
// ============================================================================

import type { InternalAxiosRequestConfig } from 'axios'

export type RequestInterceptor = (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig

export interface Chatflow {
    id: string
    name: string
    flowData: string
    deployed?: boolean
    isPublic?: boolean
    apikeyid?: string
    chatbotConfig?: string
    createdDate: string
    updatedDate: string
    type?: string
}

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

export interface CredentialSchemaInput {
    label: string
    name: string
    type: 'password' | 'string' | 'number' | 'boolean' | 'options' | 'json'
    default?: unknown
    optional?: boolean
    description?: string
    placeholder?: string
    options?: Array<{ label: string; name: string }>
    hidden?: boolean
    rows?: number
    warning?: string
}

export interface ComponentCredentialSchema {
    label: string
    name: string
    description?: string
    inputs?: CredentialSchemaInput[]
}

export interface CreateCredentialBody {
    name: string
    credentialName: string
    plainDataObj: Record<string, unknown>
}
