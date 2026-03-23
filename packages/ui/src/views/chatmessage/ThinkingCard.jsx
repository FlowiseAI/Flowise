import { useState, useEffect, memo } from 'react'
import PropTypes from 'prop-types'
import { Box, Collapse, Typography, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconChevronDown, IconChevronRight, IconBrain } from '@tabler/icons-react'

const ThinkingCard = ({ thinking, thinkingDuration, isThinking, customization }) => {
    const theme = useTheme()
    const [isExpanded, setIsExpanded] = useState(false)

    // Auto-expand when thinking is active
    useEffect(() => {
        if (isThinking) {
            setIsExpanded(true)
        }
    }, [isThinking])

    if (!thinking) return null

    // Parse thinking content into bullet points
    const parseThinkingContent = (content) => {
        if (!content) return []
        // Split by newlines and filter out empty lines
        const lines = content.split('\n').filter((line) => line.trim())
        return lines
    }

    const thinkingLines = parseThinkingContent(thinking)

    // Determine header text
    const getHeaderText = () => {
        if (isThinking) {
            return 'Thinking...'
        }
        if (thinkingDuration !== undefined && thinkingDuration !== null) {
            return `Thought for ${thinkingDuration} second${thinkingDuration !== 1 ? 's' : ''}`
        }
        return 'Thinking...'
    }

    return (
        <Box
            sx={{
                width: '100%',
                borderRadius: 2,
                border: '1px solid',
                borderColor: customization.isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                backgroundColor: customization.isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'white'
            }}
        >
            {/* Header */}
            <Box
                onClick={() => setIsExpanded(!isExpanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    borderRadius: isExpanded ? '8px 8px 0 0' : 2,
                    '&:hover': {
                        backgroundColor: customization.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'
                    }
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {isExpanded ? (
                        <IconChevronDown size={16} color={theme.palette.text.secondary} />
                    ) : (
                        <IconChevronRight size={16} color={theme.palette.text.secondary} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {isThinking ? (
                        <CircularProgress size={14} thickness={5} sx={{ color: theme.palette.primary.main }} />
                    ) : (
                        <IconBrain size={16} color={theme.palette.primary.main} />
                    )}
                </Box>
                <Typography
                    variant='body2'
                    noWrap
                    sx={{
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                        whiteSpace: 'nowrap'
                    }}
                >
                    {getHeaderText()}
                </Typography>
            </Box>

            {/* Collapsible Content */}
            <Collapse in={isExpanded} unmountOnExit>
                <Box
                    sx={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        px: 2,
                        pb: 2,
                        borderTop: '1px solid',
                        borderColor: customization.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
                    }}
                >
                    {thinkingLines.length > 0 ? (
                        <Box component='ul' sx={{ m: 0, mt: 1.5, pl: 2.5, listStyleType: 'disc' }}>
                            {thinkingLines.map((line, index) => (
                                <Box
                                    component='li'
                                    key={index}
                                    sx={{
                                        mb: 0.5,
                                        color: theme.palette.text.secondary,
                                        '&::marker': {
                                            color: theme.palette.text.secondary
                                        }
                                    }}
                                >
                                    <Typography
                                        variant='body2'
                                        sx={{
                                            fontStyle: 'italic',
                                            color: theme.palette.text.secondary,
                                            lineHeight: 1.5,
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        {line}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Typography
                            variant='body2'
                            sx={{
                                mt: 1.5,
                                fontStyle: 'italic',
                                color: theme.palette.text.secondary,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}
                        >
                            {thinking}
                        </Typography>
                    )}
                </Box>
            </Collapse>
        </Box>
    )
}

ThinkingCard.propTypes = {
    thinking: PropTypes.string,
    thinkingDuration: PropTypes.number,
    isThinking: PropTypes.bool,
    customization: PropTypes.object
}

export default memo(ThinkingCard)
