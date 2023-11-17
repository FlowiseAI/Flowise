import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import PropTypes from 'prop-types'
import { MenuItem, Select } from '@mui/material'

const StarterConversationCard = ({ isGrid, chipsData, onChipClick }) => {
    if (isGrid) {
        const chipStyle = {
            margin: '5px',
            width: 'calc(50% - 10px)'
        }

        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    width: '100%'
                }}
            >
                {chipsData.map((chipLabel, index) => (
                    <Chip key={index} label={chipLabel} style={chipStyle} onClick={() => onChipClick(chipLabel)} />
                ))}
            </Box>
        )
    } else {
        return (
            <Select defaultValue='' onChange={(event) => onChipClick(event.target.value)} displayEmpty fullWidth>
                <MenuItem value='' disabled>
                    Select a Chip
                </MenuItem>
                {chipsData.map((chipLabel, index) => (
                    <MenuItem key={index} value={chipLabel}>
                        {chipLabel}
                    </MenuItem>
                ))}
            </Select>
        )
    }
}

StarterConversationCard.propTypes = {
    isGrid: PropTypes.bool,
    chipsData: PropTypes.arrayOf(PropTypes.string),
    onChipClick: PropTypes.func
}

export default StarterConversationCard
