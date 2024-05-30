import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { IconButton } from '@mui/material'
import { IconClipboard } from '@tabler/icons-react'

const CopyToClipboardButton = (props) => {
    const customization = useSelector((state) => state.customization)

    return (
        <IconButton
            disabled={props.isDisabled || props.isLoading}
            onClick={props.onClick}
            size='small'
            sx={{ background: 'transparent', border: 'none' }}
            title='Copy to clipboard'
        >
            <IconClipboard
                style={{ width: '20px', height: '20px' }}
                color={props.isLoading ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
            />
        </IconButton>
    )
}

CopyToClipboardButton.propTypes = {
    isDisabled: PropTypes.bool,
    isLoading: PropTypes.bool,
    onClick: PropTypes.func
}

export default CopyToClipboardButton
