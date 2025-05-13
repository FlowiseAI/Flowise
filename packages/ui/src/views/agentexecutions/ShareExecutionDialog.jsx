import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

// Material
import { Typography, Box, Dialog, DialogContent, DialogTitle, Button, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCopy, IconX, IconLink } from '@tabler/icons-react'

// Constants
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// API
import executionsApi from '@/api/executions'
import useApi from '@/hooks/useApi'

const ShareExecutionDialog = ({ show, executionId, onClose, onUnshare }) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)
    const [copied, setCopied] = useState(false)

    const updateExecutionApi = useApi(executionsApi.updateExecution)

    // Create shareable link
    const origin = window.location.origin
    const shareableLink = `${origin}/execution/${executionId}`

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareableLink)
        setCopied(true)

        // Show success message
        dispatch(
            enqueueSnackbarAction({
                message: 'Link copied to clipboard',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'success',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => dispatch(closeSnackbarAction(key))}>
                            <IconX />
                        </Button>
                    )
                }
            })
        )

        // Reset copied state after 2 seconds
        setTimeout(() => {
            setCopied(false)
        }, 2000)
    }

    const handleUnshare = () => {
        updateExecutionApi.request(executionId, { isPublic: false })
        if (onUnshare) onUnshare()
        onClose()
    }

    const component = show ? (
        <Dialog open={show} onClose={onClose} maxWidth='sm' fullWidth aria-labelledby='share-dialog-title'>
            <DialogTitle id='share-dialog-title' sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Public Trace Link
            </DialogTitle>
            <DialogContent>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    Anyone with the link below can view this execution trace.
                </Typography>

                {/* Link Display Box */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 3,
                        p: 1,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '8px',
                        backgroundColor: customization.isDarkMode ? theme.palette.background.paper : theme.palette.grey[100]
                    }}
                >
                    <IconLink size={20} style={{ marginRight: '8px', color: theme.palette.text.secondary }} />
                    <Typography
                        variant='body2'
                        sx={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: theme.palette.primary.main,
                            mr: 1
                        }}
                    >
                        {shareableLink}
                    </Typography>
                    <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
                        <Button variant='text' color='primary' onClick={copyToClipboard} startIcon={<IconCopy size={18} />}>
                            Copy
                        </Button>
                    </Tooltip>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button color='error' onClick={handleUnshare} sx={{ mr: 1 }}>
                        Unshare
                    </Button>
                    <Button onClick={onClose}>Close</Button>
                </Box>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ShareExecutionDialog.propTypes = {
    show: PropTypes.bool,
    executionId: PropTypes.string,
    onClose: PropTypes.func,
    onUnshare: PropTypes.func
}

export default ShareExecutionDialog
