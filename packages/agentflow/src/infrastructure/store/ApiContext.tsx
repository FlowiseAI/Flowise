import { createContext, ReactNode, useContext, useMemo } from 'react'

import type { AxiosInstance } from 'axios'

import { type ChatflowsApi, createApiClient, createChatflowsApi, createNodesApi, type NodesApi } from '../api'

interface ApiContextValue {
    client: AxiosInstance
    instanceUrl: string
    nodesApi: NodesApi
    chatflowsApi: ChatflowsApi
}

const ApiContext = createContext<ApiContextValue | null>(null)

interface ApiProviderProps {
    instanceUrl: string
    token?: string
    children: ReactNode
}

export function ApiProvider({ instanceUrl, token, children }: ApiProviderProps) {
    const value = useMemo(() => {
        const client = createApiClient(instanceUrl, token)
        const nodesApi = createNodesApi(client)
        const chatflowsApi = createChatflowsApi(client)

        return {
            client,
            instanceUrl,
            nodesApi,
            chatflowsApi
        }
    }, [instanceUrl, token])

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
