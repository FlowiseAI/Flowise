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
        color: '#FFB938'
    },
    {
        name: 'startAgentflow',
        icon: IconPlayerPlayFilled,
        color: '#7EE787'
    },
    {
        name: 'llmAgentflow',
        icon: IconSparkles,
        color: '#64B5F6'
    },
    {
        name: 'agentAgentflow',
        icon: IconRobot,
        color: '#4DD0E1'
    },
    {
        name: 'humanInputAgentflow',
        icon: IconReplaceUser,
        color: '#6E6EFD'
    },
    {
        name: 'loopAgentflow',
        icon: IconRepeat,
        color: '#FFA07A'
    },
    {
        name: 'directReplyAgentflow',
        icon: IconMessageCircleFilled,
        color: '#4DDBBB'
    },
    {
        name: 'customFunctionAgentflow',
        icon: IconFunctionFilled,
        color: '#E4B7FF'
    },
    {
        name: 'toolAgentflow',
        icon: IconTools,
        color: '#d4a373'
    },
    {
        name: 'retrieverAgentflow',
        icon: IconLibrary,
        color: '#b8bedd'
    },
    {
        name: 'conditionAgentAgentflow',
        icon: IconSubtask,
        color: '#ff8fab'
    },
    {
        name: 'stickyNoteAgentflow',
        icon: IconNote,
        color: '#fee440'
    },
    {
        name: 'httpAgentflow',
        icon: IconWorld,
        color: '#FF7F7F'
    },
    {
        name: 'iterationAgentflow',
        icon: IconRelationOneToManyFilled,
        color: '#9C89B8'
    },
    {
        name: 'executeFlowAgentflow',
        icon: IconVectorBezier2,
        color: '#a3b18a'
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
