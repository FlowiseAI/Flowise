import { Stack, Tooltip, Typography } from '@mui/material'
import { IconClock, IconCoins, IconCpu } from '@tabler/icons-react'

import type { NodeExecutionOutput } from '@/core/types'

interface MetricsDisplayProps {
    output?: NodeExecutionOutput
}

/**
 * Displays time, token, and cost metrics for a node execution.
 * Renders nothing if no metrics are available.
 */
export function MetricsDisplay({ output }: MetricsDisplayProps) {
    const delta = output?.timeMetadata?.delta
    const tokens = output?.usageMetadata?.total_tokens
    const cost = output?.usageMetadata?.total_cost

    if (delta == null && tokens == null && cost == null) return null

    return (
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 1 }}>
            {delta != null && (
                <Tooltip title='Execution time'>
                    <Stack direction='row' spacing={0.5} alignItems='center'>
                        <IconClock size={14} />
                        <Typography variant='caption'>{(delta / 1000).toFixed(2)}s</Typography>
                    </Stack>
                </Tooltip>
            )}
            {tokens != null && (
                <Tooltip title='Total tokens'>
                    <Stack direction='row' spacing={0.5} alignItems='center'>
                        <IconCpu size={14} />
                        <Typography variant='caption'>{tokens.toLocaleString()}</Typography>
                    </Stack>
                </Tooltip>
            )}
            {cost != null && cost > 0 && (
                <Tooltip title='Estimated cost (USD)'>
                    <Stack direction='row' spacing={0.5} alignItems='center'>
                        <IconCoins size={14} />
                        <Typography variant='caption'>${cost.toFixed(6)}</Typography>
                    </Stack>
                </Tooltip>
            )}
        </Stack>
    )
}
