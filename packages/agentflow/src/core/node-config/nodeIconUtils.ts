import { AGENTFLOW_ICONS, type AgentflowIcon } from './nodeIcons'

/**
 * Get icon config for a node by name
 */
export function getAgentflowIcon(name: string): AgentflowIcon | undefined {
    return AGENTFLOW_ICONS.find((icon) => icon.name === name)
}

/**
 * Get color for a node by name
 */
export function getNodeColor(name: string): string {
    return getAgentflowIcon(name)?.color || '#9e9e9e'
}
