// ============================================================================
// API Types
// ============================================================================

import type { InternalAxiosRequestConfig } from 'axios'

import type { NodeData } from './node'

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

export type ChatModel = Omit<NodeData, 'id'>

export interface Tool {
    label: string
    name: string
    imageSrc?: string
}

export interface Credential {
    id: string
    name: string
    credentialName: string
    createdDate?: string
    updatedDate?: string
    workspaceID?: string
}
