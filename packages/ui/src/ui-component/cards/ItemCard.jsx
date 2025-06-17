import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { useState } from 'react'
// material-ui
import { styled } from '@mui/material/styles'
import { Box, Grid, Typography, useTheme, Chip, Tooltip } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import FlowListMenu from '@/ui-component/button/FlowListMenu'

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

// ===========================|| ITEM CARD ||=========================== //

const ItemCard = ({ data: initialData, images, nodeTypes, onClick, type, updateFlowsApi, setError, href }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const [data, setData] = useState(initialData)

    if (!data) {
        return null
    }

    const handleCardClick = (event) => {
        if (!event.target.closest('.flow-list-menu') && !event.target.closest('.use-template-button')) {
            // Check if it's a right-click, middle-click, or cmd/ctrl+click
            if (event.button === 2 || event.button === 1 || event.ctrlKey || event.metaKey) {
                // Let the browser handle it naturally if there's an href
                if (href) {
                    return
                }
            }
            onClick(data)
        }
    }

    const renderActionButton = () => {
        if (type !== 'marketplace' && type !== 'tools') {
            return (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8
                    }}
                    className='flow-list-menu'
                >
                    <FlowListMenu
                        isAgentCanvas={type === 'agentflows'}
                        chatflow={data}
                        setError={setError}
                        updateFlowsApi={updateFlowsApi}
                        onUpdateChatflow={(updatedChatflow) => {
                            setData(updatedChatflow)
                        }}
                    />
                </Box>
            )
        }
        return null
    }

    // Wrap the card content in an anchor tag if href is provided
    const CardContent = ({ children }) => {
        if (href) {
            return (
                <Box
                    component='a'
                    href={href}
                    sx={{
                        textDecoration: 'none',
                        color: 'inherit',
                        display: 'block',
                        height: '100%'
                    }}
                    onClick={handleCardClick}
                    onMouseDown={handleCardClick}
                >
                    {children}
                </Box>
            )
        }
        return (
            <Box sx={{ height: '100%' }} onClick={handleCardClick}>
                {children}
            </Box>
        )
    }

    return (
        <CardWrapper content={false} sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} data-href={href}>
            <CardContent>
                <Box sx={{ height: '100%', p: 2.25 }}>
                    <Grid container justifyContent='space-between' direction='column' sx={{ height: '100%', gap: 3 }}>
                        <Box display='flex' flexDirection='column' sx={{ width: '100%' }}>
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
                                            background: `url(${data.iconSrc})`,
                                            backgroundSize: 'contain',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'center center'
                                        }}
                                    ></div>
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
                                    ></div>
                                )}
                                <Typography
                                    sx={{
                                        display: '-webkit-box',
                                        fontSize: '1.25rem',
                                        fontWeight: 500,
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {data.templateName || data.name}
                                </Typography>
                            </div>
                            {data.description && (
                                <span
                                    style={{
                                        display: '-webkit-box',
                                        marginTop: 10,
                                        overflowWrap: 'break-word',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {data.description}
                                </span>
                            )}
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'start',
                                gap: 1,
                                mt: 2 // Add margin-top to separate from description
                            }}
                        >
                            {images && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'start',
                                        gap: 1
                                    }}
                                >
                                    {images.slice(0, images.length > 3 ? 3 : images.length).map((img, index) => (
                                        <Tooltip key={img} title={nodeTypes && nodeTypes[index]} arrow>
                                            <Box
                                                sx={{
                                                    width: 30,
                                                    height: 30,
                                                    borderRadius: '50%',
                                                    backgroundColor: customization.isDarkMode
                                                        ? theme.palette.common.white
                                                        : theme.palette.grey[300] + 75
                                                }}
                                            >
                                                <img
                                                    style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }}
                                                    alt=''
                                                    src={img}
                                                />
                                            </Box>
                                        </Tooltip>
                                    ))}
                                    {images.length > 3 && (
                                        <Typography sx={{ alignItems: 'center', display: 'flex', fontSize: '.9rem', fontWeight: 200 }}>
                                            + {images.length - 3} More
                                        </Typography>
                                    )}
                                </Box>
                            )}
                            {data.category && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {data.category.split(';').map((tag, index) => (
                                        <Chip
                                            key={`chip-category-${tag}${index}`}
                                            label={tag}
                                            size='small'
                                            sx={{
                                                bgcolor: theme.palette.teal.main,
                                                border: `1px solid ${theme.palette.divider}`,
                                                color: theme.palette.text.primary
                                            }}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Box>
            </CardContent>
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8
                }}
                className='flow-list-menu'
            >
                {renderActionButton()}
            </Box>
        </CardWrapper>
    )
}

ItemCard.propTypes = {
    data: PropTypes.object,
    images: PropTypes.array,
    nodeTypes: PropTypes.array,
    onClick: PropTypes.func,
    type: PropTypes.string,
    updateFlowsApi: PropTypes.object,
    setError: PropTypes.func,
    href: PropTypes.string
}

export default ItemCard
