import type { CredentialsApi } from './credentials'
import type { EmbeddingsApi } from './embeddings'
import type { ChatModelsApi } from './models'
import type { NodesApi } from './nodes'
import type { RuntimeStateApi } from './runtimeState'
import type { StoresApi } from './stores'
import type { ToolsApi } from './tools'

export interface ApiServices {
    chatModelsApi: ChatModelsApi
    toolsApi: ToolsApi
    credentialsApi: CredentialsApi
    storesApi: StoresApi
    embeddingsApi: EmbeddingsApi
    runtimeStateApi: RuntimeStateApi
    nodesApi: NodesApi
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
 * - `listModels` — fetches available chat models via `POST /node-load-method/agentAgentflow`
 * - `listTools` — fetches available tool components via `POST /node-load-method/toolAgentflow`
 * - `listStores` — fetches document stores via `POST /node-load-method/agentAgentflow`
 * - `listVectorStores` — fetches vector stores via `POST /node-load-method/agentAgentflow`
 * - `listEmbeddings` — fetches embedding models via `POST /node-load-method/agentAgentflow`
 * - `listRuntimeStateKeys` — fetches runtime state keys via `POST /node-load-method/agentAgentflow`
 * - `listCredentials` — fetches credentials filtered by `params.name` via `GET /credentials?credentialName=<name>`
 * - `listActions` — fetches available actions for a node (e.g. Composio, MCP tools) via `POST /node-load-method/{nodeName}`;
 *   requires `params.nodeName` and accepts optional `params.inputs` forwarded as `currentNode.inputs`
 * - `listTables` — fetches available tables for a node (e.g. AWSDynamoDBKVStorage) via `POST /node-load-method/{nodeName}`;
 *   requires `params.nodeName` and accepts optional `params.inputs` forwarded as `currentNode.inputs`
 *
 */
export const loadMethodRegistry: Record<string, (_apis: ApiServices, _params?: Record<string, unknown>) => Promise<unknown>> = {
    listModels: (apis, params) => {
        const nodeName = params?.nodeName as string | undefined
        if (nodeName) {
            return apis.nodesApi.loadNodeMethod(nodeName, 'listModels')
        }
        return apis.chatModelsApi.getChatModels()
    },
    listTools: (apis, params) => apis.toolsApi.getAllTools(params?.nodeName as string | undefined),
    listToolInputArgs: (apis, params) =>
        apis.toolsApi.getToolInputArgs((params?.inputs as Record<string, unknown>) ?? {}, params?.nodeName as string | undefined),
    listStores: (apis) => apis.storesApi.getStores(),
    listVectorStores: (apis) => apis.storesApi.getVectorStores(),
    listEmbeddings: (apis) => apis.embeddingsApi.getEmbeddings(),
    listRuntimeStateKeys: (apis) => apis.runtimeStateApi.getRuntimeStateKeys(),
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
 * If the key is explicitly registered, returns that handler.
 * Otherwise returns a generic fallback that routes the call through
 * `nodesApi.loadNodeMethod(nodeName, name, { currentNode: { inputs } })`,
 * covering any node-specific loadMethod (e.g. `listTopics`, `listBuckets`)
 * without requiring individual registry entries.
 *
 * The fallback rejects if `params.nodeName` is not provided.
 *
 * @param name - The `loadMethod` key declared on a node `InputParam`
 */
export function getLoadMethod(name: string): (_apis: ApiServices, _params?: Record<string, unknown>) => Promise<unknown> {
    return (
        loadMethodRegistry[name] ??
        ((apis, params) => {
            const nodeName = params?.nodeName
            if (typeof nodeName !== 'string') {
                return Promise.reject(new Error(`loadMethod "${name}" requires a string "nodeName" parameter.`))
            }
            const inputs = (params?.inputs as Record<string, unknown>) ?? {}
            return apis.nodesApi.loadNodeMethod(nodeName, name, { currentNode: { inputs } })
        })
    )
}
