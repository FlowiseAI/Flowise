// AGENTFLOW_ICONS registry below is duplicated in
// packages/agentflow/src/core/node-config/nodeIcons.ts — keep in sync until
// extracted to packages/shared-ui in FLOWISE-628.

import { Box } from '@mui/material'
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

interface AgentflowIconEntry {
    icon: Icon
    color: string
}

const AGENTFLOW_ICONS: Record<string, AgentflowIconEntry> = {
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

interface NodeIconProps {
    /** Node type name, e.g. "startAgentflow", "agentAgentflow". */
    name: string
    /** Pixel size of the rendered avatar/icon. Defaults to 32. */
    size?: number
    /**
     * Base URL of the Flowise server. Used to construct the fallback
     * `${apiBaseUrl}/api/v1/node-icon/{name}` image when the node is not in
     * the static AGENTFLOW_ICONS map. If omitted, the fallback img will not
     * produce a valid request — pass it explicitly to support custom nodes.
     */
    apiBaseUrl?: string
}

/**
 * Renders the type icon for an agentflow node. Falls back to the server-side
 * `${apiBaseUrl}/api/v1/node-icon/{name}` endpoint for nodes not in the static
 * AGENTFLOW_ICONS map (e.g. custom user nodes).
 */
export function NodeIcon({ name, size = 32, apiBaseUrl = '' }: NodeIconProps) {
    const entry = AGENTFLOW_ICONS[name]

    if (entry) {
        const iconSize = Math.round(size * 0.6)
        const Icon = entry.icon
        return (
            <Box
                sx={{
                    width: size,
                    height: size,
                    // PARITY: legacy mediumAvatar uses 15px on a 34×34 box
                    // (15/34 ≈ 0.44). Scale that ratio across other sizes.
                    borderRadius: `${Math.round(size * 0.44)}px`,
                    backgroundColor: entry.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}
                aria-hidden
            >
                <Icon size={iconSize} color='white' />
            </Box>
        )
    }

    return (
        <Box
            sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: 'common.white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden'
            }}
            aria-hidden
        >
            <Box
                component='img'
                src={`${apiBaseUrl}/api/v1/node-icon/${name}`}
                alt=''
                sx={{ width: '100%', height: '100%', p: 0.5, objectFit: 'contain' }}
            />
        </Box>
    )
}
