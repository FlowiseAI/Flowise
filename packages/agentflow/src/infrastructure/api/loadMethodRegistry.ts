import type { CredentialsApi } from './credentials'
import type { ModelsApi } from './models'
import type { ToolsApi } from './tools'

export interface ApiServices {
    modelsApi: ModelsApi
    toolsApi: ToolsApi
    credentialsApi: CredentialsApi
}

export const loadMethodRegistry: Record<string, (apis: ApiServices, params?: Record<string, unknown>) => Promise<unknown>> = {
    listModels: (apis) => apis.modelsApi.getChatModels(),
    listTools: (apis) => apis.toolsApi.getAllTools(),
    listCredentials: (apis, params) => apis.credentialsApi.getCredentialsByName(params?.name as string)
}

export function getLoadMethod(name: string): ((apis: ApiServices, params?: Record<string, unknown>) => Promise<unknown>) | undefined {
    return loadMethodRegistry[name]
}
