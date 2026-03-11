import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createApiClient } from '../api/client'
import { createExecutionsApi, type ExecutionsApi } from '../api/executions'
import { createPredictionsApi, type PredictionsApi } from '../api/predictions'
import type { AxiosInstance } from 'axios'

interface ApiContextValue {
    client: AxiosInstance
    apiBaseUrl: string
    executionsApi: ExecutionsApi
    predictionsApi: PredictionsApi
}

const ApiContext = createContext<ApiContextValue | null>(null)

export const useApiContext = (): ApiContextValue => {
    const context = useContext(ApiContext)
    if (!context) {
        throw new Error('useApiContext must be used within an AgentExecutionsProvider')
    }
    return context
}

interface ApiProviderProps {
    apiBaseUrl: string
    token?: string
    children: ReactNode
}

export const ApiProvider = ({ apiBaseUrl, token, children }: ApiProviderProps) => {
    const value = useMemo(() => {
        const client = createApiClient(apiBaseUrl, token)
        return {
            client,
            apiBaseUrl,
            executionsApi: createExecutionsApi(client),
            predictionsApi: createPredictionsApi(client)
        }
    }, [apiBaseUrl, token])

    return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}
