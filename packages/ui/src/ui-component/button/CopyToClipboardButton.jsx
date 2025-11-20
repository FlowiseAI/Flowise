import PropTypes from 'prop-types'
import { IconButton } from '@mui/material'
import { IconClipboard } from '@tabler/icons-react'

const CopyToClipboardButton = (props) => {
  return (
    <IconButton
      disabled={props.isDisabled || props.isLoading}
      onClick={props.onClick}
      size="small"
      sx={{ background: 'transparent', border: 'none' }}
      title="Copy to clipboard"
    >
      <IconClipboard
        style={{ width: '20px', height: '20px' }}
        // Loading stays grey; otherwise follow themed text/icon color
        color={props.isLoading ? '#9e9e9e' : 'var(--sidebar-item-active-text)'}
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
