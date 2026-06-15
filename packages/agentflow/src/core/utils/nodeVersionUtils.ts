import type { NodeData, NodeDataSchema } from '../types'

import { initNode } from './nodeFactory'

export function isNodeOutdated(nodeData: NodeData, componentNode: NodeDataSchema): boolean {
    if (componentNode.version == null || nodeData.version == null) return false
    return componentNode.version > nodeData.version
}

export function getNodeVersionWarning(nodeData: NodeData, componentNode: NodeDataSchema): string | null {
    if (nodeData.version == null && componentNode.version != null) {
        return `Node outdated\nUpdate to latest version ${componentNode.version}`
    }
    if (nodeData.version != null && componentNode.version != null && componentNode.version > nodeData.version) {
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
