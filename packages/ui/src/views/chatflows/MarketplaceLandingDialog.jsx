'use client'
import React from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, IconButton } from '@mui/material'
import { IconX } from '@tabler/icons-react'
import MarketplaceLanding from '../marketplaces/MarketplaceLanding'

const MarketplaceLandingDialog = ({ open, onClose, templateId }) => {
    const handleClose = () => {
        onClose()
        // Remove the templateId from the URL when closing the dialog
        window.history.pushState(null, '', window.location.pathname)
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='lg' fullWidth>
            <DialogContent sx={{ p: 0, position: 'relative' }}>
                <IconButton
                    aria-label='close'
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500]
                    }}
                >
                    <IconX />
                </IconButton>
                <MarketplaceLanding templateId={templateId} isDialog={true} onClose={handleClose} />
            </DialogContent>
        </Dialog>
    )
}

MarketplaceLandingDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    templateId: PropTypes.string
}

export default MarketplaceLandingDialog
