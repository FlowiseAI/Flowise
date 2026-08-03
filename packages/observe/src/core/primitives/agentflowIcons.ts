// AGENTFLOW_ICONS registry below is duplicated in
// packages/agentflow/src/core/node-config/nodeIcons.ts — keep in sync until
// extracted to packages/shared-ui in FLOWISE-628.

import {
    type Icon,
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

import { tokens } from '@/core/theme'

export interface AgentflowIconEntry {
    icon: Icon
    color: string
}

export const AGENTFLOW_ICONS: Record<string, AgentflowIconEntry> = {
    conditionAgentflow: { icon: IconArrowsSplit, color: tokens.colors.nodes.condition },
    startAgentflow: { icon: IconPlayerPlayFilled, color: tokens.colors.nodes.start },
    llmAgentflow: { icon: IconSparkles, color: tokens.colors.nodes.llm },
    agentAgentflow: { icon: IconRobot, color: tokens.colors.nodes.agent },
    humanInputAgentflow: { icon: IconReplaceUser, color: tokens.colors.nodes.humanInput },
    loopAgentflow: { icon: IconRepeat, color: tokens.colors.nodes.loop },
    directReplyAgentflow: { icon: IconMessageCircleFilled, color: tokens.colors.nodes.directReply },
    customFunctionAgentflow: { icon: IconFunctionFilled, color: tokens.colors.nodes.customFunction },
    toolAgentflow: { icon: IconTools, color: tokens.colors.nodes.tool },
    retrieverAgentflow: { icon: IconLibrary, color: tokens.colors.nodes.retriever },
    conditionAgentAgentflow: { icon: IconSubtask, color: tokens.colors.nodes.conditionAgent },
    stickyNoteAgentflow: { icon: IconNote, color: tokens.colors.nodes.stickyNote },
    httpAgentflow: { icon: IconWorld, color: tokens.colors.nodes.http },
    iterationAgentflow: { icon: IconRelationOneToManyFilled, color: tokens.colors.nodes.iteration },
    executeFlowAgentflow: { icon: IconVectorBezier2, color: tokens.colors.nodes.executeFlow }
}
