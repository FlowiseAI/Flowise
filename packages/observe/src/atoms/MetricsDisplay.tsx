import { Chip, Stack } from '@mui/material'
import { IconClock, IconCoin, IconCoins } from '@tabler/icons-react'

import { tokens as designTokens } from '@/core/theme'
import type { NodeExecutionOutput } from '@/core/types'

interface MetricsDisplayProps {
    output?: NodeExecutionOutput
}

/**
 * Displays time, token, and cost metrics for a node execution as a chip row.
 *
 * Formatting:
 *  - Time:   `(delta / 1000).toFixed(2)` seconds; hidden when delta is falsy
 *            (so a 0ms placeholder is suppressed).
 *  - Tokens: integer count + ` tokens`.
 *  - Cost:   `$X.XX` when >= $0.01, else `$0.000000` (6 decimals) for tiny amounts.
 *            Hidden when cost is null/undefined or negative.
 *
 * Renders nothing if no metric chip is visible.
 */
export function MetricsDisplay({ output }: MetricsDisplayProps) {
    const delta = output?.timeMetadata?.delta
    const tokens = output?.usageMetadata?.total_tokens
    const cost = output?.usageMetadata?.total_cost

    const showTimeChip = !!delta
    const showTokensChip = !!tokens
    const showCostChip = cost != null && Number(cost) >= 0
    const showMetricsRow = showTimeChip || showTokensChip || showCostChip

    if (!showMetricsRow) return null

    const formatCost = (value: number) => (value >= 0.01 ? `$${value.toFixed(2)}` : `$${value.toFixed(6)}`)

    // Time + tokens use MUI's `color='secondary'` / `color='primary'` props,
    // which read from theme.palette.secondary.main / primary.main set up in
    // createObserveTheme. Cost is an explicit gold token (not in MUI palette).
    const chipIconSx = { '& .MuiChip-icon': { ml: 1, mr: 0.2 } }

    return (
        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' role='group' aria-label='Node metrics'>
            {showTimeChip && (
                <Chip
                    icon={<IconClock size={17} />}
                    label={`${(Number(delta) / 1000).toFixed(2)} seconds`}
                    size='small'
                    color='secondary'
                    sx={chipIconSx}
                />
            )}
            {showTokensChip && (
                <Chip
                    icon={<IconCoins size={17} />}
                    // Format with locale separators for readability
                    label={`${Number(tokens).toLocaleString()} tokens`}
                    size='small'
                    color='primary'
                    sx={chipIconSx}
                />
            )}
            {showCostChip && (
                <Chip
                    icon={<IconCoin size={17} />}
                    label={formatCost(Number(cost))}
                    size='small'
                    sx={{
                        backgroundColor: designTokens.colors.metrics.cost,
                        color: 'white',
                        '& .MuiChip-icon': { color: 'white', ml: 1, mr: 0.2 }
                    }}
                />
            )}
        </Stack>
    )
}
