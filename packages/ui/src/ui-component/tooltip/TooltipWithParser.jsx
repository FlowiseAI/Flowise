import { Info } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import parser from 'html-react-parser'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

export const TooltipWithParser = ({ title, style }) => {
    const customization = useSelector((state) => state.customization)

    return (
        <Tooltip title={parser(title)} placement='right'>
            <IconButton sx={{ height: 15, width: 15 }}>
                <Info
                    style={{
                        ...style,
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
    style: PropTypes.any
}
