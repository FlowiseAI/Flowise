import { INodeParams } from 'flowise-components'
import { IReactFlowObject } from '../Interface'

const SENSITIVE_HEADER_KEYS = new Set(['authorization', 'x-api-key', 'x-auth-token', 'cookie'])

/**
 * Sanitizes flowData before returning it from a public endpoint.
 * Strips password/file/folder inputs, credential ID references, and
 * auth-related HTTP headers so sensitive credentials are never exposed.
 */
export const sanitizeFlowDataForPublicEndpoint = (flowDataString: string): string => {
    if (!flowDataString) return flowDataString
    try {
        const flowData: IReactFlowObject = JSON.parse(flowDataString)
        if (!Array.isArray(flowData.nodes)) return flowDataString

        for (const node of flowData.nodes) {
            if (!node.data) continue

            // Remove credential ID reference
            delete node.data.credential

            const inputs = node.data.inputs
            const inputParams: INodeParams[] = node.data.inputParams

            if (!inputs || !inputParams) continue

            const sanitizedInputs: Record<string, unknown> = {}
            for (const key of Object.keys(inputs)) {
                const param = inputParams.find((p) => p.name === key)

                if (param && (param.type === 'password' || param.type === 'file' || param.type === 'folder')) {
                    continue
                }

                if (key === 'headers' && inputs[key]) {
                    try {
                        const rawHeaders = inputs[key]
                        // Array format: [{ key: string, value: string }, ...] (e.g. HTTP agentflow node)
                        if (Array.isArray(rawHeaders)) {
                            sanitizedInputs[key] = rawHeaders.filter(
                                (h: { key?: string; value?: string }) => !h.key || !SENSITIVE_HEADER_KEYS.has(h.key.toLowerCase())
                            )
                            continue
                        }
                        // Object/string format: Record<string, string> or JSON string thereof
                        const headers: Record<string, string> =
                            typeof rawHeaders === 'string' ? JSON.parse(rawHeaders) : { ...(rawHeaders as object) }
                        for (const h of Object.keys(headers)) {
                            if (SENSITIVE_HEADER_KEYS.has(h.toLowerCase())) delete headers[h]
                        }
                        sanitizedInputs[key] = typeof rawHeaders === 'string' ? JSON.stringify(headers) : headers
                        continue
                    } catch {
                        // Drop headers that cannot be parsed
                        continue
                    }
                }

                sanitizedInputs[key] = inputs[key]
            }
            node.data.inputs = sanitizedInputs
        }

        return JSON.stringify(flowData)
    } catch {
        return JSON.stringify({ nodes: [], edges: [] })
    }
}
