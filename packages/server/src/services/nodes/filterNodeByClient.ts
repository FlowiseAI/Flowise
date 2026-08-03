// Extracted from ./index.ts so nodes.test.ts can import it without loading
// getRunningExpressApp → flowise-components barrel → MCP SDK → pkce-challenge (ESM-only),
// which crashes Jest on Node 18 with "needs ES Modules in the VM API".
// `import type` is erased at compile time, so this file has zero runtime deps on flowise-components.
import type { INode, INodeOptionsValue, INodeParams, ClientType } from 'flowise-components'

// Filter node inputs by client. Params/options with a `client` array that excludes the requesting client are removed. No-ops when client is omitted.
export const filterNodeByClient = (node: INode, client?: ClientType): INode => {
    if (!client || !node.inputs) return node

    const filterParam = (param: INodeParams): INodeParams => {
        const filtered: INodeParams = { ...param }
        if (filtered.options) {
            filtered.options = filtered.options.filter((opt: INodeOptionsValue) => !opt.client || opt.client.includes(client))
        }
        if (filtered.tabs) {
            filtered.tabs = filtered.tabs.filter((t) => !t.client || t.client.includes(client)).map(filterParam)
        }
        if (filtered.array) {
            filtered.array = filtered.array.filter((a) => !a.client || a.client.includes(client)).map(filterParam)
        }
        return filtered
    }

    const filteredInputs = (node.inputs as INodeParams[]).filter((param) => !param.client || param.client.includes(client)).map(filterParam)

    return { ...node, inputs: filteredInputs }
}
