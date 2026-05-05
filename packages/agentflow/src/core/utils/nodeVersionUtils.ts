import type { FlowEdge, NodeData, NodeDataSchema } from '../types'

import { initNode } from './nodeFactory'

export function isNodeOutdated(nodeData: NodeData, componentNode: NodeDataSchema): boolean {
    if (!nodeData.version) return true
    return componentNode.version !== undefined && componentNode.version > nodeData.version
}

export function getNodeVersionWarning(nodeData: NodeData, componentNode: NodeDataSchema): string | null {
    if (!nodeData.version) {
        return `Node outdated\nUpdate to latest version ${componentNode.version}`
    }
    if (componentNode.version !== undefined && componentNode.version > nodeData.version) {
        return `Node version ${nodeData.version} outdated\nUpdate to latest version ${componentNode.version}`
    }
    if (componentNode.badge === 'DEPRECATING') {
        return componentNode.deprecateMessage ?? 'This node will be deprecated in the next release. Change to a new node tagged with NEW'
    }
    if (typeof componentNode.warning === 'string' && componentNode.warning) {
        return componentNode.warning
    }
    return null
}

/**
 * Re-initialize a node to the latest component schema while preserving user data.
 * Port of updateOutdatedNodeData() from packages/ui/src/utils/genericHelper.js:233-351.
 */
export function upgradeNodeData(componentNode: NodeDataSchema, existingData: NodeData): NodeData {
    const upgraded = initNode(componentNode, existingData.id, true)

    if (existingData.credential) {
        upgraded.credential = existingData.credential
    }

    if (existingData.inputs && upgraded.inputs) {
        // Preserve matching inputs; also carry over *Config keys (loadConfig accordion side-channel
        // values not present in the inputParams schema directly).
        for (const key of Object.keys(existingData.inputs)) {
            if (key in upgraded.inputs || key.endsWith('Config')) {
                upgraded.inputs[key] = existingData.inputs[key]
            }
        }
    }

    upgraded.label = existingData.label

    return upgraded
}

/**
 * Returns edges that become stale after a node upgrade.
 * Port of updateOutdatedNodeEdge() from packages/ui/src/utils/genericHelper.js:353-416
 * (AgentFlow V2 branch only).
 *
 * In AgentFlow V2, the valid targetHandle for any input edge is exactly the node ID.
 * Edges with a suffixed handle (from an old schema-specific input) are stale.
 * Output edges are never stale in V2.
 */
export function getStaleEdgesAfterUpgrade(upgradedData: NodeData, edges: FlowEdge[]): FlowEdge[] {
    const stale: FlowEdge[] = []

    for (const edge of edges) {
        if (edge.target === upgradedData.id && edge.targetHandle !== upgradedData.id) {
            stale.push(edge)
        }
    }

    return stale
}
