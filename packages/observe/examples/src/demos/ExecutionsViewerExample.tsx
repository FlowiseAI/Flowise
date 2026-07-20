import { ExecutionsViewer, HumanInputParams } from '@flowiseai/observe'
import { Box, Typography } from '@mui/material'

import { agentflowCanvasUrl, flowId } from '../config'

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
                {flowId ? (
                    <>
                        Scoped to agentflow: <code>{flowId}</code>
                    </>
                ) : (
                    <>
                        Showing all executions — set <code>VITE_FLOW_ID</code> to scope to a single agentflow
                    </>
                )}
            </Typography>
            <Box sx={{ height: 600, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <ExecutionsViewer
                    agentflowId={flowId}
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
