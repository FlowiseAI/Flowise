import { Info } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import parser from 'html-react-parser'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

export const TooltipWithParser = ({ title, sx }) => {
    const customization = useSelector((state) => state.customization)

    return (
        <Tooltip title={parser(title)} placement='right'>
            <IconButton sx={{ height: 15, width: 15, ml: 2, mt: -0.5 }}>
                <Info
                    sx={{
                        ...sx,
                        background: 'transparent',
                        color: customization.isDarkMode ? 'white' : 'inherit',
                        height: 15,
                        width: 15
                    }}
                />
            </IconButton>
        </Tooltip>
    )
}

TooltipWithParser.propTypes = {
    title: PropTypes.node,
    sx: PropTypes.any
}
