import { useMemo } from 'react'

import type { VariableItem } from '@/atoms/inputs'
import type { FlowEdge, FlowNode } from '@/core/types'
import { useAgentflowContext } from '@/infrastructure/store'

// ── Static global variables (always available) ──────────────────────────────

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
        description: 'Files uploaded from the chat',
        category: 'Chat Context',
        value: '{{file_attachment}}'
    }
]

const FLOW_VARIABLES: VariableItem[] = [
    { label: '$flow.sessionId', description: 'Current session ID', category: 'Flow Variables', value: '{{$flow.sessionId}}' },
    { label: '$flow.chatId', description: 'Current chat ID', category: 'Flow Variables', value: '{{$flow.chatId}}' },
    {
        label: '$flow.chatflowId',
        description: 'Current chatflow ID',
        category: 'Flow Variables',
        value: '{{$flow.chatflowId}}'
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
 * Lives in the features layer so it can read from AgentflowContext.
 * The returned items are passed to the SelectVariable atom via props.
 */
export function useAvailableVariables(nodeId: string): VariableItem[] {
    const { state } = useAgentflowContext()
    const { nodes, edges } = state

    return useMemo(() => {
        const items: VariableItem[] = [...GLOBAL_VARIABLES, ...FLOW_VARIABLES]

        // ── Flow state variables from startAgentflow node ────────────────
        const startNode = nodes.find((n) => n.data.name === 'startAgentflow')
        if (startNode) {
            const startState = startNode.data.inputValues?.startState
            if (Array.isArray(startState)) {
                for (const entry of startState) {
                    if (entry && typeof entry === 'object' && 'key' in entry && typeof entry.key === 'string') {
                        items.push({
                            label: `$flow.state.${entry.key}`,
                            description: `State variable: ${entry.key}`,
                            category: 'Flow State',
                            value: `{{$flow.state.${entry.key}}}`
                        })
                    }
                }
            }

            // ── Form inputs from startAgentflow ──────────────────────────
            const formInputTypes = startNode.data.inputValues?.formInputTypes
            if (Array.isArray(formInputTypes)) {
                for (const input of formInputTypes) {
                    if (input && typeof input === 'object' && 'name' in input && typeof input.name === 'string') {
                        const inputLabel = ('label' in input && typeof input.label === 'string' ? input.label : input.name) as string
                        items.push({
                            label: `$form.${input.name}`,
                            description: `Form Input: ${inputLabel}`,
                            category: 'Form Inputs',
                            value: `{{$form.${input.name}}}`
                        })
                    }
                }
            }
        }

        // ── Upstream node outputs ────────────────────────────────────────
        const upstreamNodes = getUpstreamNodes(nodeId, nodes, edges)
        for (const node of upstreamNodes) {
            const displayName =
                (node.data.inputValues?.chainName as string) ??
                (node.data.inputValues?.functionName as string) ??
                (node.data.inputValues?.variableName as string) ??
                node.data.label ??
                node.data.id

            items.push({
                label: displayName,
                description: `Output from ${node.data.label ?? node.data.name}`,
                category: 'Node Outputs',
                value: `{{${node.id}.data.instance}}`
            })
        }

        return items
    }, [nodeId, nodes, edges])
}
