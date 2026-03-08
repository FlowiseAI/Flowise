import { memo } from 'react'

import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material'

export interface NodeInfoDialogProps {
    open: boolean
    onClose: () => void
    label: string
    name: string
    nodeId: string
    description?: string
}

/**
 * Dialog showing node information
 */
function NodeInfoDialogComponent({ open, onClose, label, name, nodeId, description }: NodeInfoDialogProps) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
            <DialogTitle>{label}</DialogTitle>
            <DialogContent>
                <Typography variant='body2' color='text.secondary'>
                    <strong>Name:</strong> {name}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                    <strong>ID:</strong> {nodeId}
                </Typography>
                {description && (
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                        <strong>Description:</strong> {description}
                    </Typography>
                )}
            </DialogContent>
        </Dialog>
    )
}

export const NodeInfoDialog = memo(NodeInfoDialogComponent)
