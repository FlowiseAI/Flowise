import { Box, Chip, type SxProps, type Theme } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconTool } from '@tabler/icons-react'

import type { UsedToolEntry } from '@/core/types'

interface UsedToolChipsProps {
    tools: UsedToolEntry[]
    sx?: SxProps<Theme>
}

export function UsedToolChips({ tools, sx }: UsedToolChipsProps) {
    const theme = useTheme()
    const filtered = tools.filter(Boolean)
    if (filtered.length === 0) return null

    return (
        <Box sx={sx}>
            {filtered.map((tool, idx) => (
                <Chip
                    key={idx}
                    size='small'
                    variant='outlined'
                    label={tool.tool}
                    icon={<IconTool size={15} color={tool.error ? theme.palette.error.main : undefined} />}
                    sx={{
                        mr: 1,
                        mt: 1,
                        borderColor: tool.error ? 'error.main' : undefined,
                        color: tool.error ? 'error.main' : undefined
                    }}
                />
            ))}
        </Box>
    )
}
