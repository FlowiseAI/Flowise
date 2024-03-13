import PropTypes from 'prop-types'

// material-ui
import { styled } from '@mui/material/styles'
import { Box, Grid, Typography } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import SkeletonChatflowCard from '@/ui-component/cards/Skeleton/ChatflowCard'

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
    maxHeight: '300px',
    maxWidth: '300px',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line'
}))

// ===========================|| CONTRACT CARD ||=========================== //

const ItemCard = ({ isLoading, data, images, onClick }) => {
    return (
        <>
            {isLoading ? (
                <SkeletonChatflowCard />
            ) : (
                <CardWrapper border={false} content={false} onClick={onClick}>
                    <Box sx={{ p: 2.25 }}>
                        <Grid container direction='column'>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center'
                                }}
                            >
                                {data.iconSrc && (
                                    <div
                                        style={{
                                            width: 35,
                                            height: 35,
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
                                            marginRight: 10,
                                            borderRadius: '50%',
                                            background: data.color
                                        }}
                                    ></div>
                                )}
                                <Typography
                                    sx={{ fontSize: '1.5rem', fontWeight: 500, overflowWrap: 'break-word', whiteSpace: 'pre-line' }}
                                >
                                    {data.templateName || data.name}
                                </Typography>
                            </div>
                            {data.description && (
                                <span style={{ marginTop: 10, overflowWrap: 'break-word', whiteSpace: 'pre-line' }}>
                                    {data.description}
                                </span>
                            )}
                            {images && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        marginTop: 5
                                    }}
                                >
                                    {images.map((img) => (
                                        <div
                                            key={img}
                                            style={{
                                                width: 35,
                                                height: 35,
                                                marginRight: 5,
                                                borderRadius: '50%',
                                                backgroundColor: 'white',
                                                marginTop: 5
                                            }}
                                        >
                                            <img
                                                style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }}
                                                alt=''
                                                src={img}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Grid>
                    </Box>
                </CardWrapper>
            )}
        </>
    )
}

ItemCard.propTypes = {
    isLoading: PropTypes.bool,
    data: PropTypes.object,
    images: PropTypes.array,
    onClick: PropTypes.func
}

export default ItemCard
