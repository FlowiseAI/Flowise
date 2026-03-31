import { useMemo } from 'react'

import type { VariableItem } from '@/atoms/SelectVariable'
import type { FlowEdge, FlowNode } from '@/core/types'
import { useAgentflowContext } from '@/infrastructure/store'

// ── Static global variables (matches original SelectVariable.jsx) ───────────

const GLOBAL_VARIABLES: VariableItem[] = [
    { label: 'question', description: "User's question from chatbox", category: 'Chat Context', value: '{{question}}' },
    {
        label: 'chat_history',
        description: 'Past conversation history between user and AI',
        category: 'Chat Context',
        value: '{{chat_history}}'
    },
    {
        label: 'file_attachment',
        description: 'Files uploaded from the chat when Full File Upload is enabled on the Configuration',
        category: 'Chat Context',
        value: '{{file_attachment}}'
    }
]

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Walk edges backward from `nodeId` to collect all direct upstream source nodes.
 */
function getUpstreamNodes(nodeId: string, nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
    const sourceIds = new Set<string>()
    for (const edge of edges) {
        if (edge.target === nodeId) {
            sourceIds.add(edge.source)
        }
    }
    return nodes.filter((n) => sourceIds.has(n.id))
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the list of variable items available for a given node.
 *
 * Matches the original SelectVariable.jsx behaviour:
 * - Global variables: question, chat_history, file_attachment
 * - Upstream node outputs (from edges)
 * - Flow state variables (from startAgentflow node's startState)
 *
 * Lives in the features layer so it can read from AgentflowContext.
 * The returned items are passed to the SelectVariable atom via props.
 */
export function useAvailableVariables(nodeId: string): VariableItem[] {
    const { state } = useAgentflowContext()
    const { nodes, edges } = state

    return useMemo(() => {
        const items: VariableItem[] = [...GLOBAL_VARIABLES]

        // ── Upstream node outputs ────────────────────────────────────────
        const upstreamNodes = getUpstreamNodes(nodeId, nodes, edges)
        for (const node of upstreamNodes) {
            const displayName =
                (node.data.inputs?.chainName as string) ??
                (node.data.inputs?.functionName as string) ??
                (node.data.inputs?.variableName as string) ??
                node.data.label ??
                node.data.id

            items.push({
                label: displayName,
                description: `Output from ${node.data.label ?? node.data.name}`,
                category: 'Node Outputs',
                value: `{{${node.id}.data.instance}}`
            })
        }

        // ── Flow state variables from startAgentflow node ────────────────
        const startNode = nodes.find((n) => n.data.name === 'startAgentflow')
        if (startNode) {
            const startState = startNode.data.inputs?.startState
            if (Array.isArray(startState)) {
                for (const entry of startState) {
                    if (entry && typeof entry === 'object' && 'key' in entry && typeof entry.key === 'string') {
                        items.push({
                            label: `$flow.state.${entry.key}`,
                            description: `Current value of the state variable with specified key`,
                            category: 'Flow State',
                            value: `$flow.state.${entry.key}`
                        })
                    }
                }
            }
        }

        return items
    }, [nodeId, nodes, edges])
}
