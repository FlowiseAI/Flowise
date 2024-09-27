import Box from '@mui/material/Box'
import PropTypes from 'prop-types'
import { Chip } from '@mui/material'
import './StarterPromptsCard.css'

const FollowUpPromptsCard = ({ isGrid, followUpPrompts, sx, onPromptClick }) => {
    return (
        <Box
            className={'button-container'}
            sx={{ width: '100%', maxWidth: isGrid ? 'inherit' : '400px', p: 1.5, display: 'flex', gap: 1, ...sx }}
        >
            {followUpPrompts.map((fp, index) => (
                <Chip label={fp} className={'button'} key={index} onClick={(e) => onPromptClick(fp, e)} />
            ))}
        </Box>
    )
}

FollowUpPromptsCard.propTypes = {
    isGrid: PropTypes.bool,
    followUpPrompts: PropTypes.array,
    sx: PropTypes.object,
    onPromptClick: PropTypes.func
}

export default FollowUpPromptsCard
