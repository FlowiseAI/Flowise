import PropTypes from 'prop-types'
import { LinearProgress } from '@mui/material'

// Progress bar showing step completion
export const ProgressBar = ({ step, total }) => {
    const percent = ((step + 1) / total) * 100

    return (
        <LinearProgress
            variant='determinate'
            value={percent}
            sx={{
                height: 6,
                borderRadius: 4,
                backgroundColor: '#eee',
                '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    transition: 'transform 0.25s ease'
                }
            }}
        />
    )
}

ProgressBar.propTypes = {
    step: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired
}
