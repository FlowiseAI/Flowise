import { Box } from '@mui/material'

import { AGENTFLOW_ICONS } from '@/core/primitives'

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
