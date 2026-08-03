import { Box, Chip, Stack, type SxProps, type Theme, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { NodeIcon } from '@/atoms'
import type { AvailableToolEntry, ChatMessage } from '@/core/types'
import { extractToolCalls, resolveTool } from '@/core/utils'

import { NodeContentRenderer } from './NodeContentRenderer'
import { getRoleColors } from './roleColors'
import { ToolAccordionList } from './ToolAccordionList'
import { UsedToolChips } from './UsedToolChips'

interface ChatMessageBubbleProps {
    message: ChatMessage
    isDarkMode: boolean
    sx?: SxProps<Theme>
    availableTools?: AvailableToolEntry[]
    apiBaseUrl?: string
}

export function ChatMessageBubble({ message, isDarkMode, sx, availableTools, apiBaseUrl }: ChatMessageBubbleProps) {
    const theme = useTheme()
    const role = message.role ?? 'unknown'
    const colors = getRoleColors(role, theme, isDarkMode)
    const chipSx = { backgroundColor: colors.bg, color: colors.color, borderColor: colors.border }
    const usedTools = message.additional_kwargs?.usedTools?.filter(Boolean) ?? []
    const { calls: toolCalls, suppressContent: hideContent } = extractToolCalls(message)
    const isToolMessage = role === 'tool' && !!message.name
    const toolHeader = isToolMessage ? resolveTool(message.name as string, availableTools) : null

    return (
        <Box sx={sx}>
            {/* Inline (not Stack) — a flex container offsets the first chip a
                few px right of the markdown paragraph below it. */}
            <Box sx={{ mb: 1 }}>
                <Chip label={role} size='small' variant='outlined' sx={chipSx} />
                {message.name && <Chip label={message.name} size='small' variant='outlined' sx={{ ...chipSx, ml: 1 }} />}
            </Box>
            {usedTools.length > 0 && <UsedToolChips tools={usedTools} sx={{ mb: 1 }} />}
            {toolCalls.length > 0 && (
                <ToolAccordionList
                    variant='called'
                    calls={toolCalls}
                    availableTools={availableTools}
                    isDarkMode={isDarkMode}
                    apiBaseUrl={apiBaseUrl}
                />
            )}
            {toolHeader && (
                <Stack direction='row' alignItems='center' sx={{ mt: 1, mb: 1 }}>
                    <NodeIcon name={toolHeader.iconName} size={28} apiBaseUrl={apiBaseUrl} />
                    <Typography variant='body1' sx={{ ml: 1 }}>
                        {toolHeader.label}
                    </Typography>
                    {message.tool_call_id && (
                        <Chip
                            label={message.tool_call_id}
                            size='small'
                            variant='outlined'
                            sx={{
                                ml: 1,
                                height: 20,
                                borderColor: isDarkMode ? 'common.white' : 'divider'
                            }}
                        />
                    )}
                </Stack>
            )}
            {!hideContent && <NodeContentRenderer value={message.content} isDarkMode={isDarkMode} />}
        </Box>
    )
}
