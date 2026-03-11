import { createPortal } from 'react-dom'
import { useState } from 'react'
import { Typography, Box, Dialog, DialogContent, DialogTitle, Button, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCopy, IconLink } from '@tabler/icons-react'
import { useConfigContext } from '../../infrastructure/store/ConfigContext'
import { useApiContext } from '../../infrastructure/store/ApiContext'
import { useApi } from '../../infrastructure/api/hooks'

interface ShareExecutionDialogProps {
    show: boolean
    executionId?: string
    onClose: () => void
    onUnshare?: () => void
}

export const ShareExecutionDialog = ({ show, executionId, onClose, onUnshare }: ShareExecutionDialogProps) => {
    const config = useConfigContext()
    const { executionsApi } = useApiContext()
    const portalElement = config.portalElement || document.body
    const theme = useTheme()
    const [copied, setCopied] = useState(false)

    const updateExecutionApi = useApi(executionsApi.updateExecution)

    const origin = config.originUrl || window.location.origin
    const shareableLink = `${origin}/execution/${executionId}`

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareableLink)
        setCopied(true)
        config.onNotification?.('Link copied to clipboard', 'success')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleUnshare = () => {
        if (executionId) {
            updateExecutionApi.request(executionId, { isPublic: false })
        }
        onUnshare?.()
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

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 3,
                        p: 1,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '8px',
                        backgroundColor: config.isDarkMode ? theme.palette.background.paper : theme.palette.grey[100]
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
