import { ExecutionsViewer, HumanInputParams } from '@flowiseai/observe'
import { Box, Typography } from '@mui/material'

import { agentflowCanvasUrl, flowIds } from '../config'

// Build the navigation handler only when a canvas URL is configured. When
// unset, `onAgentflowClick` stays undefined and the SDK renders the chip
// non-clickable.
const onAgentflowClick: ((agentflowId: string) => void) | undefined = agentflowCanvasUrl
    ? (agentflowId) => window.open(`${agentflowCanvasUrl}/${agentflowId}`, '_blank', 'noopener,noreferrer')
    : undefined

export default function ExecutionsViewerExample() {
    return (
        <Box>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                {flowIds && flowIds.length > 1 ? (
                    <>
                        Scoped to {flowIds.length} agentflows: <code>{flowIds.join(', ')}</code>
                    </>
                ) : flowIds && flowIds.length === 1 ? (
                    <>
                        Scoped to agentflow: <code>{flowIds[0]}</code>
                    </>
                ) : (
                    <>
                        Showing all executions — set <code>VITE_FLOW_IDS</code> (one UUID, or comma-separated UUIDs) to scope
                    </>
                )}
            </Typography>
            <Box sx={{ height: 600, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <ExecutionsViewer
                    agentflowIds={flowIds}
                    allowDelete={true}
                    pollInterval={3000}
                    onHumanInput={async (agentflowId: string, params: HumanInputParams) => {
                        console.info('[Example] onHumanInput', agentflowId, params)
                    }}
                    onAgentflowClick={onAgentflowClick}
                />
            </Box>
        </Box>
    )
}
