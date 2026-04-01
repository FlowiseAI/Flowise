import type { FlowEdge, FlowNode } from '@/core/types'

/** Regex that matches `{{variablePath}}` tokens in text. Use with `g` flag. */
export const VARIABLE_REGEX = /\{\{([^{}]+)\}\}/g

/**
 * Extract all variable paths from a string containing `{{variable}}` tokens.
 *
 * @example
 * extractVariables('Hello {{question}}, see {{node1.data.instance}}')
 * // => ['question', 'node1.data.instance']
 */
export function extractVariables(text: string): string[] {
    const matches: string[] = []
    let match: RegExpExecArray | null
    // Reset lastIndex for safety (global regex)
    VARIABLE_REGEX.lastIndex = 0
    while ((match = VARIABLE_REGEX.exec(text)) !== null) {
        const inside = match[1].trim()
        // Skip JSON-like content (e.g. {{"key": "value"}})
        if (!inside.includes(':')) {
            matches.push(inside)
        }
    }
    return matches
}

/**
 * Recursively walk edges backward from `nodeId` to collect **all** ancestor nodes
 * in the AgentFlow V2 graph. Excludes `startAgentflow` by default (its state
 * variables are handled separately by `useAvailableVariables`). Also traverses
 * the `parentNode` property for nodes inside iteration groups.
 *
 * Matches the `collectAgentFlowV2ParentNodes` logic in
 * packages/ui/src/utils/genericHelper.js:655-672.
 *
 * @param includeStart  When true, include `startAgentflow` in the results.
 */
export function getUpstreamNodes(nodeId: string, nodes: FlowNode[], edges: FlowEdge[], includeStart = false): FlowNode[] {
    const collected = new Set<string>()
    // Never include the queried node itself (prevents self-reference in cycles)
    collected.add(nodeId)

    function collect(targetId: string) {
        // In AgentFlow V2, targetHandle === targetNodeId for node-level connections
        const inputEdges = edges.filter((e) => e.target === targetId)

        for (const edge of inputEdges) {
            if (collected.has(edge.source)) continue

            const parentNode = nodes.find((n) => n.id === edge.source)
            if (!parentNode) continue

            // Exclude startAgentflow unless explicitly requested
            if (parentNode.data.name === 'startAgentflow' && !includeStart) {
                continue
            }

            collected.add(parentNode.id)
            // Recurse to collect the full ancestor chain
            collect(parentNode.id)
        }
    }

    collect(nodeId)

    // Also traverse the parentNode property (for nodes inside iteration groups)
    const targetNode = nodes.find((n) => n.id === nodeId)
    if (targetNode?.parentNode) {
        collect(targetNode.parentNode)
    }

    return nodes.filter((n) => n.id !== nodeId && collected.has(n.id))
}
