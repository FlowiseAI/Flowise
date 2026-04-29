import { Box, Chip, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { JsonBlock } from '@/atoms'
import type { ConditionEntry } from '@/core/types'

function isElseCondition(c: ConditionEntry): boolean {
    return c.type === 'string' && c.operation === 'equal' && c.value1 === '' && c.value2 === ''
}

interface FulfilledConditionsBlockProps {
    conditions: ConditionEntry[]
    isDarkMode: boolean
}

/**
 * Renders only the fulfilled entries from a condition node's
 * `data.output.conditions` array — success-bordered boxes with a "Fulfilled"
 * chip. The "else" branch (string/equal with both values empty) shows a
 * sentence-style label; other branches show "Condition {n}" using the index
 * from the original `conditions` array, so the displayed number matches the
 * branch the user configured in the Condition node editor.
 *
 * PARITY: deviation — legacy `renderFullfilledConditions` filtered first then
 * indexed by post-filter position, which mislabeled "branch 2 fired" as
 * "Condition 0". Iterating over the original array fixes that.
 */
export function FulfilledConditionsBlock({ conditions, isDarkMode }: FulfilledConditionsBlockProps) {
    const theme = useTheme()
    if (!conditions.some((c) => c.isFulfilled)) return null

    const boxSx = {
        border: 1,
        borderColor: 'success.main',
        borderRadius: 1,
        p: 2,
        backgroundColor: 'background.paper'
    } as const
    const chipSx = { color: theme.palette.common.white, backgroundColor: theme.palette.success.dark }

    return (
        <Stack spacing={1}>
            {conditions.map((condition, index) => {
                if (!condition.isFulfilled) return null
                if (isElseCondition(condition)) {
                    return (
                        <Box key={`else-${index}`} sx={boxSx}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant='body1'>Else condition fulfilled</Typography>
                                <Chip label='Fulfilled' size='small' variant='filled' sx={chipSx} />
                            </Box>
                        </Box>
                    )
                }
                return (
                    <Box key={`condition-${index}`} sx={boxSx}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant='subtitle2'>Condition {index}</Typography>
                            <Chip label='Fulfilled' size='small' variant='filled' sx={chipSx} />
                        </Box>
                        <JsonBlock value={condition} isDarkMode={isDarkMode} />
                    </Box>
                )
            })}
        </Stack>
    )
}
