import Box from '@mui/material/Box'
import PropTypes from 'prop-types'
import { Chip } from '@mui/material'
import './StarterPromptsCard.css'
import { useSelector } from 'react-redux'

const FollowUpPromptsCard = ({ isGrid, followUpPrompts, sx, onPromptClick }) => {
    const customization = useSelector((state) => state.customization)

    return (
        <Box
            className={'button-container'}
            sx={{ width: '100%', maxWidth: isGrid ? 'inherit' : '400px', p: 1.5, display: 'flex', gap: 1, ...sx }}
        >
            {followUpPrompts.map((fp, index) => (
                <Chip
                    label={fp}
                    className={'button'}
                    key={index}
                    onClick={(e) => onPromptClick(fp, e)}
                    sx={{
                        backgroundColor: 'transparent',
                        border: '1px solid',
                        boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2)',
                        color: '#2196f3',
                        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                        '&:hover': {
                            backgroundColor: customization.isDarkMode ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.05)',
                            border: '1px solid'
                        }
                    }}
                />
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
