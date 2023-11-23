import Box from '@mui/material/Box'
import PropTypes from 'prop-types'
import { Button } from '@mui/material'
import './StarterPromptsCard.css'

const StarterPromptsCard = ({ isGrid, starterPrompts, onPromptClick }) => {
    return (
        <Box className={'button-container'} sx={{ maxWidth: isGrid ? 'inherit' : '400px' }}>
            {starterPrompts.map((sp, index) => (
                <Button variant='outlined' className={'button'} key={index} onClick={(e) => onPromptClick(sp.prompt, e)}>
                    {sp.prompt}
                </Button>
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
