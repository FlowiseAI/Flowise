import type { CredentialsApi } from './credentials'
import type { ModelsApi } from './models'
import type { ToolsApi } from './tools'

export interface ApiServices {
    modelsApi: ModelsApi
    toolsApi: ToolsApi
    credentialsApi: CredentialsApi
}

export const loadMethodRegistry: Record<string, (_apis: ApiServices, _params?: Record<string, unknown>) => Promise<unknown>> = {
    listModels: (apis) => apis.modelsApi.getChatModels(),
    listTools: (apis) => apis.toolsApi.getAllTools(),
    listCredentials: (apis, params) => {
        const name = params?.name
        if (typeof name !== 'string') {
            return Promise.reject(new Error('`listCredentials` requires a string `name` parameter.'))
        }
        return apis.credentialsApi.getCredentialsByName(name)
    }
}

export function getLoadMethod(name: string): ((_apis: ApiServices, _params?: Record<string, unknown>) => Promise<unknown>) | undefined {
    return loadMethodRegistry[name]
}
