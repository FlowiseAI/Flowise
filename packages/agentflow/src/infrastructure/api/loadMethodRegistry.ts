import type { CredentialsApi } from './credentials'
import type { ChatModelsApi } from './models'
import type { ToolsApi } from './tools'

export interface ApiServices {
    chatModelsApi: ChatModelsApi
    toolsApi: ToolsApi
    credentialsApi: CredentialsApi
}

/**
 * Registry that maps `loadMethod` string keys — as declared on node `InputParam` definitions
 * (e.g. `{ loadMethod: 'listTools' }`) — to functions that fetch the corresponding options
 * from the Flowise API.
 *
 * Each entry receives the shared {@link ApiServices} instance and an optional `params` object,
 * and must return a `Promise` of the option values to populate the node's dropdown.
 *
 * ### Built-in entries
 * - `listModels` — fetches available chat models via `GET /assistants/components/chatmodels`
 * - `listTools` — fetches available tool components via `POST /node-load-method/toolAgentflow`
 * - `listCredentials` — fetches credentials filtered by `params.name` (credential component name)
 *   via `GET /credentials?credentialName=<name>`
 *
 */
export const loadMethodRegistry: Record<string, (_apis: ApiServices, _params?: Record<string, unknown>) => Promise<unknown>> = {
    listModels: (apis) => apis.chatModelsApi.getChatModels(),
    listTools: (apis, params) => apis.toolsApi.getAllTools(params?.nodeName as string | undefined),
    listToolInputArgs: (apis, params) =>
        apis.toolsApi.getToolInputArgs((params?.inputs as Record<string, unknown>) ?? {}, params?.nodeName as string | undefined),
    listCredentials: (apis, params) => {
        const name = params?.name
        if (typeof name !== 'string') {
            return Promise.reject(new Error('`listCredentials` requires a string `name` parameter.'))
        }
        return apis.credentialsApi.getCredentialsByName(name)
    }
}

/**
 * Looks up a load method handler by its string key.
 *
 * Returns `undefined` if no handler is registered for the given name,
 * which callers should treat as a no-op or fallback.
 *
 * @param name - The `loadMethod` key declared on a node `InputParam`
 */
export function getLoadMethod(name: string): ((_apis: ApiServices, _params?: Record<string, unknown>) => Promise<unknown>) | undefined {
    return loadMethodRegistry[name]
}
