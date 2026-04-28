import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { Box, Stack, Typography, useTheme } from '@mui/material'
import { IconTool } from '@tabler/icons-react'

// project imports
import { MCP_SERVER_STATUS } from '@/store/constant'

const getStatusDotColor = (status, isDarkMode, theme) => {
    switch (status) {
        case MCP_SERVER_STATUS.AUTHORIZED:
            return isDarkMode ? '#81c784' : '#43a047'
        case MCP_SERVER_STATUS.ERROR:
            return isDarkMode ? '#ef9a9a' : '#c62828'
        case MCP_SERVER_STATUS.PENDING:
        default:
            return isDarkMode ? theme.palette.grey[500] : theme.palette.grey[500]
    }
}

// ===========================|| MCP ITEM CARD ||=========================== //

const MCPItemCard = ({ data, onClick }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const isDarkMode = customization.isDarkMode

    const toolCount = typeof data.toolCount === 'number' ? data.toolCount : 0
    const dotColor = getStatusDotColor(data.status, isDarkMode, theme)

    return (
        <Box
            onClick={onClick}
            sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 2,
                height: '100%',
                borderRadius: 3,
                border: `1px solid ${theme.palette.grey[900]}15`,
                cursor: 'pointer',
                backgroundColor: theme.palette.card?.main || theme.palette.background.paper,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'background-color 0.2s, box-shadow 0.2s',
                '&:hover': {
                    backgroundColor: theme.palette.card?.hover || theme.palette.action.hover,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
                }
            }}
        >
            {data.iconSrc && (
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                        borderRadius: '50%',
                        backgroundImage: `url(${data.iconSrc})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center center'
                    }}
                />
            )}
            {!data.iconSrc && data.color && (
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                        borderRadius: '50%',
                        background: data.color
                    }}
                />
            )}
            <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <Stack direction='row' alignItems='center' spacing={1} sx={{ pr: 0.5 }}>
                    <Typography
                        sx={{
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            color: theme.palette.text.primary
                        }}
                    >
                        {data.name}
                    </Typography>
                    {data.status && (
                        <Box
                            title={data.status}
                            sx={{
                                flexShrink: 0,
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                backgroundColor: dotColor,
                                boxShadow: isDarkMode ? `0 0 0 3px ${dotColor}40` : `0 0 0 3px ${dotColor}22`
                            }}
                        />
                    )}
                </Stack>
                {data.serverUrl && (
                    <Typography
                        sx={{
                            mt: 0.5,
                            fontSize: '0.8rem',
                            color: isDarkMode ? theme.palette.grey[400] : theme.palette.grey[700],
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            wordBreak: 'break-all'
                        }}
                    >
                        {data.serverUrl}
                    </Typography>
                )}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        columnGap: 1.5,
                        rowGap: 0.5,
                        mt: 1.25,
                        color: isDarkMode ? theme.palette.grey[400] : theme.palette.grey[700]
                    }}
                >
                    <Stack direction='row' alignItems='center' spacing={0.5}>
                        <IconTool size={13} />
                        <Typography sx={{ fontSize: '0.75rem' }}>
                            {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
                        </Typography>
                    </Stack>
                </Box>
            </Box>
        </Box>
    )
}

MCPItemCard.propTypes = {
    data: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        serverUrl: PropTypes.string,
        status: PropTypes.string,
        tools: PropTypes.string,
        toolCount: PropTypes.number,
        iconSrc: PropTypes.string,
        color: PropTypes.string
    }).isRequired,
    onClick: PropTypes.func
}

export default MCPItemCard
