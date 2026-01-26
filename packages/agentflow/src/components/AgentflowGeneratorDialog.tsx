import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box } from '@mui/material'

interface AgentflowGeneratorDialogProps {
    show: boolean
    dialogProps: {
        title?: string
        description?: string
    }
    onCancel: () => void
    onConfirm: () => void
}

const AgentflowGeneratorDialog: React.FC<AgentflowGeneratorDialogProps> = ({ show, dialogProps, onCancel, onConfirm }) => {
    const [prompt, setPrompt] = useState('')

    const handleConfirm = () => {
        // In the full implementation, this would call the API to generate the agentflow
        // For now, we'll just call the onConfirm callback
        onConfirm()
        setPrompt('')
    }

    const handleCancel = () => {
        onCancel()
        setPrompt('')
    }

    return (
        <Dialog open={show} onClose={handleCancel} fullWidth maxWidth='sm'>
            <DialogTitle>{dialogProps.title || 'Generate Agentflow'}</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1 }}>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        {dialogProps.description ||
                            'Enter your prompt to generate an agentflow. Performance may vary with different models.'}
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={4}
                        label='Prompt'
                        placeholder='e.g., Create a customer support agent that can answer questions about products and handle refunds...'
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        variant='outlined'
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>Cancel</Button>
                <Button onClick={handleConfirm} variant='contained' color='primary' disabled={!prompt.trim()}>
                    Generate
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default AgentflowGeneratorDialog
