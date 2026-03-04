import { DEFAULT_AGENTFLOW_NODES } from '../node-config'
import type { NodeData } from '../types'

/**
 * Filter nodes based on allowed components list
 * @param allNodes - All available nodes from API
 * @param allowedComponents - Array of allowed node names (optional)
 * @returns Filtered array of nodes
 */
export function filterNodesByComponents(allNodes: NodeData[], allowedComponents?: string[]): NodeData[] {
    // If no filter specified, return all agentflow nodes
    if (!allowedComponents || allowedComponents.length === 0) {
        return allNodes.filter((node) => DEFAULT_AGENTFLOW_NODES.includes(node.name))
    }

    // Always include startAgentflow - it's required
    const requiredNodes = ['startAgentflow']
    const allowed = new Set([...requiredNodes, ...allowedComponents])

    return allNodes.filter((node) => allowed.has(node.name))
}

/**
 * Check if a node type is an agentflow node
 */
export function isAgentflowNode(nodeName: string): boolean {
    return DEFAULT_AGENTFLOW_NODES.includes(nodeName)
}

/**
 * Group nodes by category
 */
export function groupNodesByCategory(nodes: NodeData[]): Record<string, NodeData[]> {
    return nodes.reduce((acc, node) => {
        const category = node.category || 'Other'
        if (!acc[category]) {
            acc[category] = []
        }
        acc[category].push(node)
        return acc
    }, {} as Record<string, NodeData[]>)
}
