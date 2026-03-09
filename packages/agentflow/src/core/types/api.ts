// ============================================================================
// API Types
// ============================================================================

import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

export type RequestInterceptor = (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig

export interface ApiContextValue {
    client: AxiosInstance
    apiBaseUrl: string
}

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
