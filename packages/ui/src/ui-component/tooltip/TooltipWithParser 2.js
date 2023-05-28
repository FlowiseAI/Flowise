import { Info } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import parser from 'html-react-parser'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

export const TooltipWithParser = ({ title }) => {
    const customization = useSelector((state) => state.customization)

    return (
        <Tooltip title={parser(title)} placement='right'>
            <IconButton sx={{ height: 25, width: 25 }}>
                <Info style={{ background: 'transparent', color: customization.isDarkMode ? 'white' : 'inherit', height: 18, width: 18 }} />
            </IconButton>
        </Tooltip>
    )
}

TooltipWithParser.propTypes = {
    title: PropTypes.node
}
