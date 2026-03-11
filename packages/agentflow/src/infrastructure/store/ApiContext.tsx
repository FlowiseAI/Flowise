import { createContext, ReactNode, useContext, useMemo, useRef } from 'react'

import type { AxiosInstance } from 'axios'

import type { RequestInterceptor } from '@/core/types'

import {
    bindChatModelsApi,
    bindCredentialsApi,
    bindToolsApi,
    type ChatflowsApi,
    type ChatModelsApi,
    createApiClient,
    createChatflowsApi,
    createNodesApi,
    type CredentialsApi,
    type NodesApi,
    type ToolsApi
} from '../api'

interface ApiContextValue {
    client: AxiosInstance
    apiBaseUrl: string
    nodesApi: NodesApi
    chatflowsApi: ChatflowsApi
    chatModelsApi: ChatModelsApi
    toolsApi: ToolsApi
    credentialsApi: CredentialsApi
}

const ApiContext = createContext<ApiContextValue | null>(null)

interface ApiProviderProps {
    apiBaseUrl: string
    token?: string
    requestInterceptor?: RequestInterceptor
    children: ReactNode
}

export function ApiProvider({ apiBaseUrl, token, requestInterceptor, children }: ApiProviderProps) {
    // Use ref so the consumer doesn't need to memoize requestInterceptor and won't get a new client on every render.
    const interceptorRef = useRef(requestInterceptor)
    interceptorRef.current = requestInterceptor

    const value = useMemo(() => {
        const client = createApiClient(apiBaseUrl, token, (config) => {
            return interceptorRef.current?.(config) ?? config
        })
        const nodesApi = createNodesApi(client)
        const chatflowsApi = createChatflowsApi(client)
        const chatModelsApi = bindChatModelsApi(client)
        const toolsApi = bindToolsApi(client)
        const credentialsApi = bindCredentialsApi(client)

        return {
            client,
            apiBaseUrl,
            nodesApi,
            chatflowsApi,
            chatModelsApi,
            toolsApi,
            credentialsApi
        }
    }, [apiBaseUrl, token])

    return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

export function useApiContext(): ApiContextValue {
    const context = useContext(ApiContext)
    if (!context) {
        throw new Error('useApiContext must be used within AgentflowProvider')
    }
    return context
}

export { ApiContext }
