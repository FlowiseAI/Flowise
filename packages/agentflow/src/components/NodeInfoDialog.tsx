import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material'

interface NodeInfoDialogProps {
    show: boolean
    dialogProps: {
        data?: any
    }
    onCancel: () => void
}

const NodeInfoDialog: React.FC<NodeInfoDialogProps> = ({ show, dialogProps, onCancel }) => {
    const { data } = dialogProps

    if (!data) return null

    return (
        <Dialog open={show} onClose={onCancel} maxWidth='md' fullWidth>
            <DialogTitle>{data.label || data.name}</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                        {data.description || 'No description available'}
                    </Typography>
                </Box>

                {data.category && (
                    <Box sx={{ mb: 1 }}>
                        <Typography variant='caption' color='text.secondary'>
                            Category:
                        </Typography>
                        <Typography variant='body2'>{data.category}</Typography>
                    </Box>
                )}

                {data.version && (
                    <Box sx={{ mb: 1 }}>
                        <Typography variant='caption' color='text.secondary'>
                            Version:
                        </Typography>
                        <Typography variant='body2'>{data.version}</Typography>
                    </Box>
                )}

                {data.inputParams && data.inputParams.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant='subtitle2' sx={{ mb: 1 }}>
                            Parameters:
                        </Typography>
                        {data.inputParams.map((param: any, index: number) => (
                            <Box key={index} sx={{ mb: 1, ml: 2 }}>
                                <Typography variant='caption' color='text.secondary'>
                                    {param.label || param.name}
                                </Typography>
                                <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>
                                    {param.description || 'No description'}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}

export default NodeInfoDialog
