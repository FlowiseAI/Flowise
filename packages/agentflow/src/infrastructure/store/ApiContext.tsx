import { createContext, ReactNode, useContext, useMemo } from 'react'

import type { AxiosInstance } from 'axios'

import { type ChatflowsApi, createApiClient, createChatflowsApi, createNodesApi, type NodesApi } from '../api'

interface ApiContextValue {
    client: AxiosInstance
    apiBaseUrl: string
    nodesApi: NodesApi
    chatflowsApi: ChatflowsApi
}

const ApiContext = createContext<ApiContextValue | null>(null)

interface ApiProviderProps {
    apiBaseUrl: string
    token?: string
    children: ReactNode
}

export function ApiProvider({ apiBaseUrl, token, children }: ApiProviderProps) {
    const value = useMemo(() => {
        const client = createApiClient(apiBaseUrl, token)
        const nodesApi = createNodesApi(client)
        const chatflowsApi = createChatflowsApi(client)

        return {
            client,
            apiBaseUrl,
            nodesApi,
            chatflowsApi
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
