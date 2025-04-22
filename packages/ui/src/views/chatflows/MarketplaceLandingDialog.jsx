'use client'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, IconButton } from '@mui/material'
import { IconX } from '@tabler/icons-react'
import MarketplaceLanding from '../marketplaces/MarketplaceLanding'

const MarketplaceLandingDialog = ({ open, onClose, templateId, onUse }) => {
    const handleClose = () => {
        onClose()
        window.history.pushState(null, '', window.location.pathname)
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth='lg'
            fullWidth
            PaperProps={{
                sx: {
                    height: '90vh',
                    maxHeight: '900px'
                }
            }}
        >
            <DialogContent sx={{ p: 0, position: 'relative' }}>
                <IconButton
                    aria-label='close'
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                        zIndex: 1
                    }}
                >
                    <IconX />
                </IconButton>
                <MarketplaceLanding templateId={templateId} isDialog={true} onClose={handleClose} onUse={onUse} />
            </DialogContent>
        </Dialog>
    )
}

MarketplaceLandingDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    templateId: PropTypes.string,
    onUse: PropTypes.func.isRequired
}

export default MarketplaceLandingDialog
