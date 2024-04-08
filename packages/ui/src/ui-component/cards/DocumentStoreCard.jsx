import PropTypes from 'prop-types'

// material-ui
import { styled } from '@mui/material/styles'
import { CardActions, Typography } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import SkeletonCard from '@/ui-component/cards/Skeleton/ChatflowCard'
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

const DocumentStoreCard = ({ isLoading, data, onClick }) => {
    return (
        <>
            {isLoading ? (
                <SkeletonCard />
            ) : (
                <CardWrapper onClick={onClick}>
                    <Card style={{ paddingTop: 18 }}>
                        <CardContent style={{ padding: 2.25, minHeight: '100px' }}>
                            <Typography style={{ wordWrap: 'break-word' }} variant='h4' component='div'>
                                {data.name}
                            </Typography>
                            <Typography style={{ wordBreak: 'break-word' }} variant='body2'>
                                {data.description}
                            </Typography>
                        </CardContent>
                        <CardActions style={{ padding: 2, marginTop: 15 }}>
                            <Typography style={{ marginBottom: 1.0 }} color='text.secondary'>
                                {data.totalFiles}: Files
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
    onClick: PropTypes.func
}

export default DocumentStoreCard
