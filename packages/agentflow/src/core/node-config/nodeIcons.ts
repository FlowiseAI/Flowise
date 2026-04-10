import type { ComponentType } from 'react'

import {
    IconArrowsSplit,
    IconFunctionFilled,
    IconLibrary,
    IconMessageCircleFilled,
    IconNote,
    IconPlayerPlayFilled,
    IconRelationOneToManyFilled,
    IconRepeat,
    IconReplaceUser,
    IconRobot,
    IconSparkles,
    IconSubtask,
    IconTools,
    IconVectorBezier2,
    IconWorld
} from '@tabler/icons-react'

import { tokens } from '../theme/tokens'

// Using 'any' for icon props to be compatible with tabler-icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = ComponentType<any>

export interface AgentflowIcon {
    name: string
    icon: IconComponent
    color: string
}

export const AGENTFLOW_ICONS: AgentflowIcon[] = [
    {
        name: 'conditionAgentflow',
        icon: IconArrowsSplit,
        color: tokens.colors.nodes.condition
    },
    {
        name: 'startAgentflow',
        icon: IconPlayerPlayFilled,
        color: tokens.colors.nodes.start
    },
    {
        name: 'llmAgentflow',
        icon: IconSparkles,
        color: tokens.colors.nodes.llm
    },
    {
        name: 'agentAgentflow',
        icon: IconRobot,
        color: tokens.colors.nodes.agent
    },
    {
        name: 'humanInputAgentflow',
        icon: IconReplaceUser,
        color: tokens.colors.nodes.humanInput
    },
    {
        name: 'loopAgentflow',
        icon: IconRepeat,
        color: tokens.colors.nodes.loop
    },
    {
        name: 'directReplyAgentflow',
        icon: IconMessageCircleFilled,
        color: tokens.colors.nodes.directReply
    },
    {
        name: 'customFunctionAgentflow',
        icon: IconFunctionFilled,
        color: tokens.colors.nodes.customFunction
    },
    {
        name: 'toolAgentflow',
        icon: IconTools,
        color: tokens.colors.nodes.tool
    },
    {
        name: 'retrieverAgentflow',
        icon: IconLibrary,
        color: tokens.colors.nodes.retriever
    },
    {
        name: 'conditionAgentAgentflow',
        icon: IconSubtask,
        color: tokens.colors.nodes.conditionAgent
    },
    {
        name: 'stickyNoteAgentflow',
        icon: IconNote,
        color: tokens.colors.nodes.stickyNote
    },
    {
        name: 'httpAgentflow',
        icon: IconWorld,
        color: tokens.colors.nodes.http
    },
    {
        name: 'iterationAgentflow',
        icon: IconRelationOneToManyFilled,
        color: tokens.colors.nodes.iteration
    },
    {
        name: 'executeFlowAgentflow',
        icon: IconVectorBezier2,
        color: tokens.colors.nodes.executeFlow
    }
]

/**
 * Default node types that are always available
 */
export const DEFAULT_AGENTFLOW_NODES = [
    'startAgentflow',
    'llmAgentflow',
    'agentAgentflow',
    'conditionAgentflow',
    'conditionAgentAgentflow',
    'humanInputAgentflow',
    'loopAgentflow',
    'directReplyAgentflow',
    'customFunctionAgentflow',
    'toolAgentflow',
    'retrieverAgentflow',
    'stickyNoteAgentflow',
    'httpAgentflow',
    'iterationAgentflow',
    'executeFlowAgentflow'
]
