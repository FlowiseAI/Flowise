import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { styled } from '@mui/material/styles'
import { Box, Grid, Tooltip, Typography, useTheme } from '@mui/material'
import { IconTool } from '@tabler/icons-react'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { MCP_SERVER_STATUS } from '@/store/constant'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    cursor: 'pointer',
    '&:hover': {
        background: theme.palette.card.hover,
        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 20%)'
    },
    height: '100%',
    minHeight: '160px',
    maxHeight: '300px',
    width: '100%',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line'
}))

const getStatusColors = (status, isDarkMode, theme) => {
    switch (status) {
        case MCP_SERVER_STATUS.AUTHORIZED:
            return isDarkMode ? ['#1b5e20', '#2e7d32', '#ffffff'] : ['#e8f5e9', '#81c784', '#43a047']
        case MCP_SERVER_STATUS.ERROR:
            return isDarkMode ? ['#b71c1c', '#c62828', '#ffffff'] : ['#ffebee', '#ef9a9a', '#c62828']
        case MCP_SERVER_STATUS.PENDING:
        default:
            return isDarkMode
                ? [theme.palette.grey[800], theme.palette.grey[500], theme.palette.grey[200]]
                : [theme.palette.grey[100], theme.palette.grey[400], theme.palette.grey[700]]
    }
}

// ===========================|| MCP ITEM CARD ||=========================== //

const MCPItemCard = ({ data, onClick }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const isDarkMode = customization.isDarkMode

    const toolCount = typeof data.toolCount === 'number' ? data.toolCount : 0

    const statusColors = getStatusColors(data.status, isDarkMode, theme)

    return (
        <CardWrapper content={false} onClick={onClick} sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}>
            <Box sx={{ height: '100%', p: 2.25 }}>
                <Grid container justifyContent='space-between' direction='column' sx={{ height: '100%' }} gap={2}>
                    {/* Header: icon + name + status badge */}
                    <Box display='flex' flexDirection='column' sx={{ flex: 1, width: '100%' }}>
                        <div
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                overflow: 'hidden'
                            }}
                        >
                            {data.iconSrc && (
                                <div
                                    style={{
                                        width: 35,
                                        height: 35,
                                        display: 'flex',
                                        flexShrink: 0,
                                        marginRight: 10,
                                        borderRadius: '50%',
                                        backgroundImage: `url(${data.iconSrc})`,
                                        backgroundSize: 'contain',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center center'
                                    }}
                                />
                            )}
                            {!data.iconSrc && data.color && (
                                <div
                                    style={{
                                        width: 35,
                                        height: 35,
                                        display: 'flex',
                                        flexShrink: 0,
                                        marginRight: 10,
                                        borderRadius: '50%',
                                        background: data.color
                                    }}
                                />
                            )}
                            <Typography
                                sx={{
                                    display: '-webkit-box',
                                    fontSize: '1.25rem',
                                    fontWeight: 500,
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    flex: 1,
                                    mr: 1
                                }}
                            >
                                {data.name}
                            </Typography>
                            {/* Status badge */}
                            {data.status && (
                                <div
                                    style={{
                                        flexShrink: 0,
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        background: statusColors[0],
                                        borderRadius: '25px',
                                        paddingTop: '3px',
                                        paddingBottom: '3px',
                                        paddingLeft: '10px',
                                        paddingRight: '10px'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            backgroundColor: statusColors[1],
                                            marginRight: 5
                                        }}
                                    />
                                    <span style={{ fontSize: '0.65rem', color: statusColors[2], textTransform: 'uppercase' }}>
                                        {data.status}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Server URL */}
                        {data.serverUrl && (
                            <Tooltip title={data.serverUrl} placement='bottom-start'>
                                <Typography
                                    variant='body2'
                                    sx={{
                                        mt: 1,
                                        color: theme.palette.text.secondary,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 1,
                                        WebkitBoxOrient: 'vertical',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    {data.serverUrl}
                                </Typography>
                            </Tooltip>
                        )}
                    </Box>

                    {/* Footer: tool count badge */}
                    <Grid container columnGap={2} rowGap={1}>
                        <div
                            style={{
                                paddingLeft: '7px',
                                paddingRight: '7px',
                                paddingTop: '3px',
                                paddingBottom: '3px',
                                fontSize: '11px',
                                width: 'max-content',
                                borderRadius: '25px',
                                boxShadow: isDarkMode ? '0 2px 14px 0 rgb(255 255 255 / 20%)' : '0 2px 14px 0 rgb(32 40 45 / 20%)',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            <IconTool style={{ marginRight: 5 }} size={15} />
                            {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
                        </div>
                    </Grid>
                </Grid>
            </Box>
        </CardWrapper>
    )
}

MCPItemCard.propTypes = {
    data: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        serverUrl: PropTypes.string,
        status: PropTypes.string,
        tools: PropTypes.string, // JSON stringified array (legacy; no longer shipped on list responses)
        toolCount: PropTypes.number,
        iconSrc: PropTypes.string,
        color: PropTypes.string
    }).isRequired,
    onClick: PropTypes.func
}

export default MCPItemCard
