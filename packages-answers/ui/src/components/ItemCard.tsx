import React from 'react'
import { Card, CardContent, Box, Typography, Grid, useTheme } from '@mui/material'

interface ItemCardProps {
    data: {
        name: string
        description?: string
        iconSrc?: string
        color?: string
        templateName?: string
    }
    images?: string[]
    icons?: Array<{ icon: any; color: string }>
    onClick?: () => void
}

type ItemType = { type: 'image'; src: string } | { type: 'icon'; icon: any; color: string }

const ItemCard: React.FC<ItemCardProps> = ({ data, images, icons, onClick }) => {
    const theme = useTheme()

    return (
        <Card
            elevation={0}
            onClick={onClick}
            sx={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(20px)',
                cursor: 'pointer',
                height: '100%',
                minHeight: '160px',
                maxHeight: '300px',
                width: '100%',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-line',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.3)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                }
            }}
        >
            <CardContent sx={{ p: 2.25, height: '100%' }}>
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
                                    color: '#fff',
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
                            <Typography
                                sx={{
                                    display: '-webkit-box',
                                    marginTop: 1,
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    overflowWrap: 'break-word',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden'
                                }}
                            >
                                {data.description}
                            </Typography>
                        )}
                    </Box>
                    {((images && images.length > 0) || (icons && icons.length > 0)) && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'start',
                                gap: 1
                            }}
                        >
                            {[
                                ...(images ?? []).map((img) => ({ type: 'image' as const, src: img })),
                                ...(icons ?? []).map((ic) => ({ type: 'icon' as const, icon: ic.icon, color: ic.color }))
                            ]
                                .slice(0, 3)
                                .map((item: ItemType, index) =>
                                    item.type === 'image' ? (
                                        <Box
                                            key={item.src}
                                            sx={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: '50%',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)'
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
                                            key={index}
                                            style={{
                                                width: 30,
                                                height: 30,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <item.icon size={25} color={item.color} />
                                        </div>
                                    )
                                )}
                            {(images?.length || 0) + (icons?.length || 0) > 3 && (
                                <Typography
                                    sx={{
                                        alignItems: 'center',
                                        display: 'flex',
                                        fontSize: '.9rem',
                                        fontWeight: 200,
                                        color: 'rgba(255, 255, 255, 0.5)'
                                    }}
                                >
                                    + {(images?.length || 0) + (icons?.length || 0) - 3} More
                                </Typography>
                            )}
                        </Box>
                    )}
                </Grid>
            </CardContent>
        </Card>
    )
}

export default ItemCard
