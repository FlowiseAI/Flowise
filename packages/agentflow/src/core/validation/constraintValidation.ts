import type { FlowNode } from '../types'

export interface ConstraintResult {
    valid: boolean
    message?: string
}

/**
 * Check that only one start node exists in the flow
 */
export function checkSingleStartNode(nodes: FlowNode[], newNodeName: string): ConstraintResult {
    if (newNodeName === 'startAgentflow' && nodes.some((n) => n.data.name === 'startAgentflow')) {
        return { valid: false, message: 'Only one start node is allowed' }
    }
    return { valid: true }
}

/**
 * Check that iteration nodes are not nested inside other iteration nodes
 */
export function checkNestedIteration(newNodeName: string, parentNode: FlowNode | null): ConstraintResult {
    if (newNodeName === 'iterationAgentflow' && parentNode?.type === 'iteration') {
        return { valid: false, message: 'Nested iteration nodes are not supported' }
    }
    return { valid: true }
}

/**
 * Check that human input nodes are not placed inside iteration nodes
 */
export function checkHumanInputInIteration(newNodeName: string, parentNode: FlowNode | null): ConstraintResult {
    if (newNodeName === 'humanInputAgentflow' && parentNode?.type === 'iteration') {
        return { valid: false, message: 'Human input node is not supported inside Iteration node' }
    }
    return { valid: true }
}

/**
 * Check all placement constraints for a node being added to the canvas.
 * Returns the first failing constraint, or a valid result if all pass.
 */
export function checkNodePlacementConstraints(
    nodes: FlowNode[],
    nodeType: string,
    position?: { x: number; y: number } | null
): ConstraintResult {
    const startCheck = checkSingleStartNode(nodes, nodeType)
    if (!startCheck.valid) return startCheck

    if (position) {
        const parentNode = findParentIterationNode(nodes, position)
        if (parentNode) {
            const nestedCheck = checkNestedIteration(nodeType, parentNode)
            if (!nestedCheck.valid) return nestedCheck

            const humanInputCheck = checkHumanInputInIteration(nodeType, parentNode)
            if (!humanInputCheck.valid) return humanInputCheck
        }
    }

    return { valid: true }
}

/**
 * Find the iteration node that contains the given position, if any
 */
export function findParentIterationNode(nodes: FlowNode[], position: { x: number; y: number }): FlowNode | null {
    const iterationNodes = nodes.filter((node) => node.type === 'iteration')

    for (const iterationNode of iterationNodes) {
        const nodeWidth = iterationNode.width || 300
        const nodeHeight = iterationNode.height || 250

        const nodeLeft = iterationNode.position.x
        const nodeRight = nodeLeft + nodeWidth
        const nodeTop = iterationNode.position.y
        const nodeBottom = nodeTop + nodeHeight

        if (position.x >= nodeLeft && position.x <= nodeRight && position.y >= nodeTop && position.y <= nodeBottom) {
            return iterationNode
        }
    }

    return null
}
