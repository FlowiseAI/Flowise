import PropTypes from 'prop-types'

import { useSelector } from 'react-redux'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const StatsCard = ({ title, stat }) => {
    const customization = useSelector((state) => state.customization)
    return (
        <Card sx={{ border: '1px solid #e0e0e0', borderRadius: `${customization.borderRadius}px` }}>
            <CardContent>
                <Typography sx={{ fontSize: '0.875rem' }} color='text.primary' gutterBottom>
                    {title}
                </Typography>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 500 }} color='text.primary'>
                    {stat}
                </Typography>
            </CardContent>
        </Card>
    )
}

StatsCard.propTypes = {
    title: PropTypes.string,
    stat: PropTypes.string | PropTypes.number
}

export default StatsCard
