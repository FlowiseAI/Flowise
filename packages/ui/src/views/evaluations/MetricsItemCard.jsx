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
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    cursor: 'pointer',
    '&:hover': {
        background: theme.palette.card.hover,
        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 20%)'
    },
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line'
}))

const MetricsItemCard = ({ isLoading, data, component }) => {
    return (
        <>
            {isLoading ? (
                <SkeletonChatflowCard />
            ) : (
                <CardWrapper content={false} sx={{ height: 270, cursor: 'auto', textAlign: 'center', border: 'false' }}>
                    <Box sx={{ p: 2.25 }}>
                        <Grid container direction='column' alignItems='center' justifyContent='center'>
                            <Grid item>
                                <Grid container alignItems='center' justifyContent='center' gap={1}>
                                    <Grid item>{data.icon}</Grid>
                                    <Grid item>
                                        <Typography variant='h5'>{data.header}</Typography>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Box>
                    <Box>{component}</Box>
                </CardWrapper>
            )}
        </>
    )
}

MetricsItemCard.propTypes = {
    isLoading: PropTypes.bool,
    data: PropTypes.object,
    component: PropTypes.element
}

export default MetricsItemCard
