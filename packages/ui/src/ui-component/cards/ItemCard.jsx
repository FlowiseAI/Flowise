import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { styled } from '@mui/material/styles'
import { Box, Grid, Tooltip, Typography, useTheme } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
// Note: MoreItemsTooltip is not used directly here, but needed for styling logic in nodes visualization
// import MoreItemsTooltip from '../tooltip/MoreItemsTooltip' 

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

// 💥 Added tagsComponent prop 💥
const ItemCard = ({ data, images, icons, onClick, tagsComponent }) => { 
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    return (
        <CardWrapper content={false} onClick={onClick} sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}>
            <Box sx={{ height: '100%', p: 2.25 }}>
                <Grid container justifyContent='space-between' direction='column' sx={{ height: '100%', gap: 1 }}> 
                    
                    {/* Top Content: Name, Description */}
                    <Box display='flex' flexDirection='column' sx={{ width: '100%' }}>
                        
                        {/* 💥 TAGS COMPONENT (Visible above name/icon) 💥 */}
                        {tagsComponent && (
                            <Box sx={{ mb: 0 }}>
                                {tagsComponent}
                            </Box>
                        )}

                        {/* Name Section */}
                        <div
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Icon/Color logic for name prefix (kept for backward compatibility with older flow types) */}
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
                        
                        {/* Description Section */}
                        {data.description && (
                            <span
                                style={{
                                    display: '-webkit-box',
                                    marginTop: 5, // Reduced margin for tighter spacing
                                    overflowWrap: 'break-word',
                                    WebkitLineClamp: 2, // Changed to 2 lines for tighter card display
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    fontSize: '0.9rem', // Smaller font size for description
                                    color: theme.palette.text.secondary
                                }}
                            >
                                {data.description}
                            </span>
                        )}
                    </Box>
                    
                    {/* 💥 NODE ICON VISUALIZATION (At the bottom, max 2 icons) 💥 */}
                    {(images?.length > 0 || icons?.length > 0) && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'start',
                                gap: 1
                            }}
                        >
                            {[
                                ...(images || []).map((img) => ({ type: 'image', src: img.imageSrc, label: img.label })),
                                ...(icons || []).map((ic) => ({ type: 'icon', icon: ic.icon, color: ic.color, label: ic.name }))
                            ]
                                .slice(0, 2) // 💥 Show only 2 icons 💥
                                .map((item, index) => (
                                    <Tooltip key={item.src || index} title={item.label} placement='top'>
                                        {item.type === 'image' ? (
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
                                                    src={item.src}
                                                />
                                            </Box>
                                        ) : (
                                            <div
                                                style={{
                                                    width: 30,
                                                    height: 30,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                {/* Assuming item.icon is a React component */}
                                                <item.icon size={25} color={item.color} /> 
                                            </div>
                                        )}
                                    </Tooltip>
                                ))}
                        </Box>
                    )}
                </Grid>
            </Box>
        </CardWrapper>
    )
}

ItemCard.propTypes = {
    data: PropTypes.object,
    images: PropTypes.arrayOf(PropTypes.object), 
    icons: PropTypes.arrayOf(PropTypes.object), 
    onClick: PropTypes.func,
    // 💥 New prop for custom tags component 💥
    tagsComponent: PropTypes.node 
}

export default ItemCard