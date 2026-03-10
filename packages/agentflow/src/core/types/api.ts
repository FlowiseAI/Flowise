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

export type Model = Omit<NodeData, 'id'>

export interface Tool {
    id: string
    name: string
    description?: string
    iconSrc?: string
    schema?: string
    func?: string
    color?: string
    createdDate: string
    updatedDate: string
    workspaceID?: string
}

export interface Credential {
    id: string
    name: string
    credentialName: string
    createdDate?: string
    updatedDate?: string
    workspaceID?: string
}
