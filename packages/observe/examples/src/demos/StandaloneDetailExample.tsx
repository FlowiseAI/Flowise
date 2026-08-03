import { useState } from 'react'

import { ExecutionDetail } from '@flowiseai/observe'
import { Box, TextField, Typography } from '@mui/material'

import { agentflowCanvasUrl, executionId as defaultExecutionId } from '../config'

const onAgentflowClick: ((agentflowId: string) => void) | undefined = agentflowCanvasUrl
    ? (agentflowId) => window.open(`${agentflowCanvasUrl}/${agentflowId}`, '_blank', 'noopener,noreferrer')
    : undefined

export default function StandaloneDetailExample() {
    const [executionId, setExecutionId] = useState(defaultExecutionId ?? '')

    return (
        <Box>
            <TextField
                size='small'
                label='Execution ID'
                value={executionId}
                onChange={(e) => setExecutionId(e.target.value)}
                sx={{ mb: 2, width: 380 }}
                placeholder='Paste an execution UUID…'
            />
            {executionId ? (
                <Box sx={{ height: 600, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                    <ExecutionDetail executionId={executionId} pollInterval={3000} onAgentflowClick={onAgentflowClick} />
                </Box>
            ) : (
                <Typography variant='body2' color='text.secondary'>
                    Enter an execution ID above to view its trace.
                </Typography>
            )}
        </Box>
    )
}
