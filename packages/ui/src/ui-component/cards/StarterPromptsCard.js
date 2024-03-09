import Box from '@mui/material/Box'
import PropTypes from 'prop-types'
import { Chip } from '@mui/material'
import './StarterPromptsCard.css'

const StarterPromptsCard = ({ isGrid, starterPrompts, onPromptClick }) => {
    return (
        <Box className={'button-container'} sx={{ maxWidth: isGrid ? 'inherit' : '400px', m: 1 }}>
            {starterPrompts.map((sp, index) => (
                <Chip label={sp.prompt} className={'button'} key={index} onClick={(e) => onPromptClick(sp.prompt, e)} />
            ))}
        </Box>
    )
}

StarterPromptsCard.propTypes = {
    isGrid: PropTypes.bool,
    starterPrompts: PropTypes.arrayOf(PropTypes.string),
    onPromptClick: PropTypes.func
}

export default StarterPromptsCard
