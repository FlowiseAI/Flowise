import { useState } from 'react'

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    Stack,
    type SxProps,
    type Theme,
    Typography
} from '@mui/material'
import { darken, useTheme } from '@mui/material/styles'
import { IconChevronDown } from '@tabler/icons-react'

import { JsonBlock, NodeIcon } from '@/atoms'
import type { AvailableToolEntry, NormalizedToolCall, UsedToolRef } from '@/core/types'
import { resolveTool } from '@/core/utils'

interface AvailableProps {
    variant: 'available'
    tools: AvailableToolEntry[]
    /** Tools listed here get the "Used" chip + green tint. */
    usedTools?: UsedToolRef[]
    /** Number of tools to show before the "Show N more" button. Defaults to 5. */
    initialVisibleCount?: number
}

interface CalledProps {
    variant: 'called'
    calls: NormalizedToolCall[]
    /** Used to look up an icon + display label for each call's `.name`. */
    availableTools?: AvailableToolEntry[]
}

type ToolAccordionListProps = (AvailableProps | CalledProps) & {
    isDarkMode: boolean
    apiBaseUrl?: string
}

interface AccordionRow {
    iconName: string
    label: string
    chip?: { label: string; bg: string; fg: string }
    json: object
    /** Container border + tint. */
    tone: 'success' | 'warning' | 'neutral'
}

/**
 * Unified accordion list for tool surfaces:
 *  - `variant='available'` — agent's available-tools list with optional "Used"
 *    chips + paginated "Show N more" button (replaces the legacy ToolsList).
 *  - `variant='called'` — tool-call invocations from a chat message with a
 *    fixed "Called" chip and warning-toned styling (replaces the legacy
 *    MessageToolCallList).
 */
export function ToolAccordionList(props: ToolAccordionListProps) {
    const theme = useTheme()
    const [showAll, setShowAll] = useState(false)

    const isAvailable = props.variant === 'available'
    const calledChipBg = darken(theme.palette.warning.dark, 0.5)

    let rows: AccordionRow[]
    if (isAvailable) {
        if (props.tools.length === 0) return null
        const usedNames = new Set((props.usedTools ?? []).map((u) => u?.tool).filter((n): n is string => typeof n === 'string'))
        rows = props.tools.map((tool): AccordionRow => {
            const isUsed = !!tool.name && usedNames.has(tool.name)
            return {
                iconName: tool.toolNode?.name ?? tool.name ?? '',
                label: tool.toolNode?.label ?? tool.name ?? 'Tool Call',
                chip: isUsed ? { label: 'Used', bg: theme.palette.success.dark, fg: theme.palette.common.white } : undefined,
                json: tool,
                tone: isUsed ? 'success' : 'neutral'
            }
        })
    } else {
        if (props.calls.length === 0) return null
        rows = props.calls.map((call): AccordionRow => {
            const { iconName, label } = resolveTool(call.name, props.availableTools)
            return {
                iconName,
                label,
                chip: { label: 'Called', bg: calledChipBg, fg: theme.palette.common.white },
                json: call.raw as object,
                tone: 'warning'
            }
        })
    }

    // Pagination is intentionally available-only: legacy never paginated tool
    // calls (their count is bounded per-message), so the 'called' variant
    // always renders every row.
    const initialVisible = isAvailable ? props.initialVisibleCount ?? 5 : rows.length
    const visible = showAll ? rows : rows.slice(0, initialVisible)
    const hasMore = isAvailable && rows.length > initialVisible

    const containerSx: SxProps<Theme> = isAvailable ? {} : { mb: 1 }

    return (
        <Box>
            {isAvailable && (
                <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                    Tools
                </Typography>
            )}
            <Stack spacing={1} sx={containerSx}>
                {visible.map((row, idx) => (
                    <ToolAccordionRow
                        key={`${props.variant}-${idx}`}
                        idx={idx}
                        row={row}
                        variant={props.variant}
                        isDarkMode={props.isDarkMode}
                        apiBaseUrl={props.apiBaseUrl}
                    />
                ))}
            </Stack>
            {hasMore && (
                <Button size='small' onClick={() => setShowAll((prev) => !prev)} sx={{ mt: 0.5, textTransform: 'none' }}>
                    {showAll ? 'Show less' : `Show ${rows.length - initialVisible} more`}
                </Button>
            )}
        </Box>
    )
}

interface ToolAccordionRowProps {
    idx: number
    row: AccordionRow
    variant: 'available' | 'called'
    isDarkMode: boolean
    apiBaseUrl?: string
}

function ToolAccordionRow({ idx, row, variant, isDarkMode, apiBaseUrl }: ToolAccordionRowProps) {
    const theme = useTheme()

    const containerBg = (() => {
        if (row.tone === 'success') return isDarkMode ? `${theme.palette.success.dark}22` : `${theme.palette.success.light}44`
        if (row.tone === 'warning') return isDarkMode ? `${theme.palette.warning.dark}22` : `${theme.palette.warning.light}44`
        return 'background.paper'
    })()
    const borderColor = row.tone === 'success' ? 'success.main' : row.tone === 'warning' ? 'warning.main' : 'divider'
    const chevronColor = isDarkMode ? '#fff' : row.tone === 'warning' ? darken(theme.palette.warning.dark, 0.5) : undefined

    const summaryId = `${variant}-${idx}-header`
    const contentId = `${variant}-${idx}-content`

    return (
        <Accordion
            disableGutters
            elevation={0}
            sx={{
                '&:before': { display: 'none' },
                backgroundColor: containerBg,
                border: 1,
                borderRadius: 1,
                borderColor,
                overflow: 'hidden'
            }}
        >
            <AccordionSummary expandIcon={<IconChevronDown size={18} color={chevronColor} />} aria-controls={contentId} id={summaryId}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <NodeIcon name={row.iconName} size={28} apiBaseUrl={apiBaseUrl} />
                    <Typography variant='body1' sx={{ ml: 1 }}>
                        {row.label}
                    </Typography>
                    {row.chip && (
                        <Chip label={row.chip.label} size='small' sx={{ ml: 2, color: row.chip.fg, backgroundColor: row.chip.bg }} />
                    )}
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <JsonBlock value={row.json} isDarkMode={isDarkMode} />
            </AccordionDetails>
        </Accordion>
    )
}
