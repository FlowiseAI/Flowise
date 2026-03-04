import type { FlowEdge, FlowNode, ValidationError, ValidationResult } from '../types'

/**
 * Validate the flow structure
 */
export function validateFlow(nodes: FlowNode[], edges: FlowEdge[]): ValidationResult {
    const errors: ValidationError[] = []

    // Check for empty flow
    if (nodes.length === 0) {
        errors.push({
            message: 'Flow is empty - add at least one node',
            type: 'error'
        })
        return { valid: false, errors }
    }

    // Check for start node
    const startNode = nodes.find((n) => n.data.name === 'startAgentflow')
    if (!startNode) {
        errors.push({
            message: 'Flow must have a start node',
            type: 'error'
        })
    }

    // Check for multiple start nodes
    const startNodes = nodes.filter((n) => n.data.name === 'startAgentflow')
    if (startNodes.length > 1) {
        errors.push({
            message: 'Flow can only have one start node',
            type: 'error'
        })
    }

    // Check for disconnected nodes
    const nonStickyNodes = nodes.filter((n) => n.data.name !== 'stickyNoteAgentflow')

    nonStickyNodes.forEach((node) => {
        const hasIncoming = edges.some((e) => e.target === node.id)
        const hasOutgoing = edges.some((e) => e.source === node.id)

        // Start node should only have outgoing connections
        if (node.data.name === 'startAgentflow') {
            if (!hasOutgoing) {
                errors.push({
                    nodeId: node.id,
                    message: 'Start node must have at least one outgoing connection',
                    type: 'warning'
                })
            }
            return
        }

        // End nodes don't need outgoing connections
        const isEndNode = ['directReplyAgentflow'].includes(node.data.name)

        if (!hasIncoming) {
            errors.push({
                nodeId: node.id,
                message: `Node "${node.data.label || node.data.name}" has no incoming connections`,
                type: 'warning'
            })
        }

        if (!isEndNode && !hasOutgoing) {
            errors.push({
                nodeId: node.id,
                message: `Node "${node.data.label || node.data.name}" has no outgoing connections`,
                type: 'warning'
            })
        }
    })

    // Check for cycles (should be handled during connection, but double-check)
    const hasCycle = detectCycle(nodes, edges)
    if (hasCycle) {
        errors.push({
            message: 'Flow contains a cycle - this may cause infinite loops',
            type: 'error'
        })
    }

    return {
        valid: errors.filter((e) => e.type === 'error').length === 0,
        errors
    }
}

/**
 * Detect if there's a cycle in the graph
 */
function detectCycle(nodes: FlowNode[], edges: FlowEdge[]): boolean {
    // Build adjacency list
    const graph: Record<string, string[]> = {}
    nodes.forEach((node) => {
        graph[node.id] = []
    })
    edges.forEach((edge) => {
        if (graph[edge.source]) {
            graph[edge.source].push(edge.target)
        }
    })

    // DFS with colors: 0 = white (unvisited), 1 = gray (in progress), 2 = black (done)
    const colors: Record<string, number> = {}
    nodes.forEach((node) => {
        colors[node.id] = 0
    })

    function dfs(nodeId: string): boolean {
        colors[nodeId] = 1 // Mark as in progress

        for (const neighbor of graph[nodeId] || []) {
            if (colors[neighbor] === 1) {
                // Back edge found - cycle detected
                return true
            }
            if (colors[neighbor] === 0 && dfs(neighbor)) {
                return true
            }
        }

        colors[nodeId] = 2 // Mark as done
        return false
    }

    // Run DFS from all unvisited nodes
    for (const node of nodes) {
        if (colors[node.id] === 0 && dfs(node.id)) {
            return true
        }
    }

    return false
}

// TODO: Integrate with per-node inline validation to surface errors on individual nodes in the canvas
/**
 * Check if a specific node is valid
 */
export function validateNode(node: FlowNode, _edges: FlowEdge[]): ValidationError[] {
    const errors: ValidationError[] = []

    // Check required fields
    if (!node.data.name) {
        errors.push({
            nodeId: node.id,
            message: 'Node is missing a name',
            type: 'error'
        })
    }

    // Check required inputs (if defined)
    const inputParams = node.data.inputs || []
    for (const param of inputParams) {
        if (!param.optional && !node.data.inputValues?.[param.name]) {
            errors.push({
                nodeId: node.id,
                message: `Required input "${param.label || param.name}" is missing`,
                type: 'warning'
            })
        }
    }

    return errors
}
