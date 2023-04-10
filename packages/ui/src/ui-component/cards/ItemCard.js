import PropTypes from 'prop-types'

// material-ui
import { styled, useTheme } from '@mui/material/styles'
import { Box, Grid, Chip, Typography } from '@mui/material'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import SkeletonChatflowCard from 'ui-component/cards/Skeleton/ChatflowCard'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    cursor: 'pointer',
    '&:hover': {
        background: theme.palette.card.hover,
        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 20%)'
    }
}))

// ===========================|| CONTRACT CARD ||=========================== //

const ItemCard = ({ isLoading, data, images, onClick }) => {
    const theme = useTheme()

    const chipSX = {
        height: 24,
        padding: '0 6px'
    }

    const activeChatflowSX = {
        ...chipSX,
        color: 'white',
        backgroundColor: theme.palette.success.dark
    }

    return (
        <>
            {isLoading ? (
                <SkeletonChatflowCard />
            ) : (
                <CardWrapper border={false} content={false} onClick={onClick}>
                    <Box sx={{ p: 2.25 }}>
                        <Grid container direction='column'>
                            <div>
                                <Typography sx={{ fontSize: '1.5rem', fontWeight: 500 }}>{data.name}</Typography>
                            </div>
                            {data.description && <span style={{ marginTop: 10 }}>{data.description}</span>}
                            <Grid sx={{ mt: 1, mb: 1 }} container direction='row'>
                                {data.deployed && (
                                    <Grid item>
                                        <Chip label='Deployed' sx={activeChatflowSX} />
                                    </Grid>
                                )}
                            </Grid>
                            {images && (
                                <div style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
                                    {images.map((img) => (
                                        <div
                                            key={img}
                                            style={{
                                                width: 40,
                                                height: 40,
                                                marginRight: 5,
                                                borderRadius: '50%',
                                                backgroundColor: 'white'
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
