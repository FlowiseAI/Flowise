import { useMemo } from 'react'

import type { VariableItem } from '@/atoms/VariablePicker'
import { getAgentflowIcon } from '@/core/node-config'
import { getDefinedStateKeys, getUpstreamNodes } from '@/core/utils'
import { useAgentflowContext } from '@/infrastructure/store'

// ── Static global variables (matches original suggestionOption.js) ───────────

const GLOBAL_VARIABLES: VariableItem[] = [
    { label: 'question', description: "User's question from chatbox", category: 'Chat Context', value: '{{question}}' },
    {
        label: 'chat_history',
        description: 'Past conversation history between user and AI',
        category: 'Chat Context',
        value: '{{chat_history}}'
    },
    {
        label: 'current_date_time',
        description: 'Current date and time',
        category: 'Chat Context',
        value: '{{current_date_time}}'
    },
    {
        label: 'runtime_messages_length',
        description: 'Total messages between LLM and Agent',
        category: 'Chat Context',
        value: '{{runtime_messages_length}}'
    },
    {
        label: 'loop_count',
        description: 'Current loop count',
        category: 'Chat Context',
        value: '{{loop_count}}'
    },
    {
        label: 'file_attachment',
        description: 'Files uploaded from the chat',
        category: 'Chat Context',
        value: '{{file_attachment}}'
    },
    { label: '$flow.sessionId', description: 'Current session ID', category: 'Flow Variables', value: '{{$flow.sessionId}}' },
    { label: '$flow.chatId', description: 'Current chat ID', category: 'Flow Variables', value: '{{$flow.chatId}}' },
    {
        label: '$flow.chatflowId',
        description: 'Current chatflow ID',
        category: 'Flow Variables',
        value: '{{$flow.chatflowId}}'
    }
]

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the list of variable items available for a given node.
 *
 * Matches the original suggestionOption.js behaviour:
 * - Chat context: question, chat_history, current_date_time, runtime_messages_length, loop_count, file_attachment
 * - Flow variables: $flow.sessionId, $flow.chatId, $flow.chatflowId
 * - Upstream node outputs (from edges)
 * - Flow state variables (from startAgentflow node's startState)
 *
 * Lives in the features layer so it can read from AgentflowContext.
 * The returned items are passed to the VariablePicker atom via props.
 */
export function useAvailableVariables(nodeId: string): VariableItem[] {
    const { state } = useAgentflowContext()
    const { nodes, edges } = state

    return useMemo(() => {
        const items: VariableItem[] = [...GLOBAL_VARIABLES]

        // ── Upstream node outputs ────────────────────────────────────────
        const upstreamNodes = getUpstreamNodes(nodeId, nodes, edges)
        for (const node of upstreamNodes) {
            if (node.data.name === 'startAgentflow') continue
            const displayName =
                (node.data.inputs?.chainName as string) ??
                (node.data.inputs?.functionName as string) ??
                (node.data.inputs?.variableName as string) ??
                node.data.label ??
                node.data.id

            const agentflowIcon = getAgentflowIcon(node.data.name)
            items.push({
                label: displayName,
                description: `Output from ${node.data.label ?? node.data.name}`,
                category: 'Node Outputs',
                value: `{{${node.id}}}`,
                icon: agentflowIcon?.icon,
                iconColor: agentflowIcon?.color
            })
        }

        // ── Flow state variables from all nodes ─────────────────────────
        const stateKeys = getDefinedStateKeys(nodes)
        for (const key of stateKeys) {
            items.push({
                label: `$flow.state.${key}`,
                description: `Current value of the state variable with specified key`,
                category: 'Flow State',
                value: `{{$flow.state.${key}}}`
            })
        }

        return items
    }, [nodeId, nodes, edges])
}
