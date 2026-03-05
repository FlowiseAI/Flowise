import type { FlowEdge, FlowNode } from '../types'

/**
 * Check if a connection is valid for AgentFlow v2
 */
export function isValidConnectionAgentflowV2(
    connection: { source: string; target: string },
    nodes: FlowNode[],
    edges: FlowEdge[]
): boolean {
    const { source, target } = connection

    // Prevent self connections
    if (source === target) {
        return false
    }

    // Check if this connection would create a cycle
    if (wouldCreateCycle(source, target, edges)) {
        return false
    }

    return true
}

/**
 * Check if adding an edge would create a cycle in the graph
 */
function wouldCreateCycle(sourceId: string, targetId: string, edges: FlowEdge[]): boolean {
    if (sourceId === targetId) {
        return true
    }

    // Build directed graph from existing edges
    const graph: Record<string, string[]> = {}
    edges.forEach((edge) => {
        if (!graph[edge.source]) graph[edge.source] = []
        graph[edge.source].push(edge.target)
    })

    // Check if there's a path from target to source
    const visited = new Set<string>()

    function hasPath(current: string, destination: string): boolean {
        if (current === destination) return true
        if (visited.has(current)) return false

        visited.add(current)

        const neighbors = graph[current] || []
        for (const neighbor of neighbors) {
            if (hasPath(neighbor, destination)) {
                return true
            }
        }

        return false
    }

    return hasPath(targetId, sourceId)
}
