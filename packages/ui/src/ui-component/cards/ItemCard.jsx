import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { Box, Grid, Typography, useTheme } from '@mui/material'

// components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// ===========================|| CONTRACT CARD ||=========================== //

const ItemCard = ({ data, images, onClick }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    return (
        <Card className='h-full cursor-pointer duration-200 transition-shadow hover:shadow-lg' onClick={onClick}>
            <CardHeader>
                <CardTitle className='flex flex-row items-center text-xl font-semibold'>
                    {data.iconSrc && <img alt='icon' className='w-6 h-6 mr-2 rounded-full' src={data.iconSrc} />}
                    {!data.iconSrc && data.color && (
                        <Box
                            className='w-6 h-6 flex shrink-0 mr-2 rounded-full'
                            sx={{
                                background: data.color
                            }}
                        />
                    )}
                    <span
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden'
                        }}
                    >
                        {data.templateName || data.name}
                    </span>
                </CardTitle>
                {data.description && (
                    <CardDescription
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
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <Grid container justifyContent='space-between' direction='column' sx={{ height: '100%', gap: 3 }}>
                    {images && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'start',
                                gap: 1
                            }}
                        >
                            {images.slice(0, images.length > 3 ? 3 : images.length).map((img) => (
                                <Box
                                    key={img}
                                    sx={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: '50%',
                                        backgroundColor: customization.isDarkMode
                                            ? theme.palette.common.white
                                            : theme.palette.grey[300] + 75
                                    }}
                                >
                                    <img style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }} alt='' src={img} />
                                </Box>
                            ))}
                            {images.length > 3 && (
                                <Typography
                                    sx={{
                                        alignItems: 'center',
                                        display: 'flex',
                                        fontSize: '.9rem',
                                        fontWeight: 200
                                    }}
                                >
                                    + {images.length - 3} More
                                </Typography>
                            )}
                        </Box>
                    )}
                </Grid>
            </CardContent>
        </Card>
    )
}

ItemCard.propTypes = {
    data: PropTypes.object,
    images: PropTypes.array,
    onClick: PropTypes.func
}

export default ItemCard
