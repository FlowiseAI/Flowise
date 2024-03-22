import PropTypes from 'prop-types'

// material-ui
import { styled } from '@mui/material/styles'
import { CardActions, Typography } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import SkeletonChatflowCard from '@/ui-component/cards/Skeleton/ChatflowCard'
import CardContent from '@mui/material/CardContent'
import Card from '@mui/material/Card'

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
    maxWidth: '98%',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line'
}))

// ===========================|| CONTRACT CARD ||=========================== //

const DocumentStoreCard = ({ isLoading, data, images, onClick }) => {
    return (
        <>
            {isLoading ? (
                <SkeletonChatflowCard />
            ) : (
                <CardWrapper onClick={onClick}>
                    <Card sx={{ minWidth: 275 }}>
                        <CardContent style={{ padding: 1 }}>
                            <Typography sx={{ wordWrap: 'break-word' }} variant='h4' component='div'>
                                {data.name}
                            </Typography>
                            <Typography sx={{ mb: 1.5 }} color='text.secondary'>
                                {' '}
                            </Typography>
                            <Typography sx={{ wordWrap: 'break-word' }} variant='body2'>
                                {data.description}
                            </Typography>
                        </CardContent>
                        <CardActions style={{ padding: 1, marginTop: 20 }}>
                            <Typography sx={{ mb: 1.5 }} color='text.secondary'>
                                0: Docs (Type: {data.contentType})
                            </Typography>
                        </CardActions>
                    </Card>
                </CardWrapper>
            )}
        </>
    )
}

DocumentStoreCard.propTypes = {
    isLoading: PropTypes.bool,
    data: PropTypes.object,
    images: PropTypes.array,
    onClick: PropTypes.func
}

export default DocumentStoreCard
