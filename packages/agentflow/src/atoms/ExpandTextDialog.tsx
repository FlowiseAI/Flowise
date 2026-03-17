import { useCallback, useEffect, useState } from 'react'

import { Button, Dialog, DialogActions, DialogContent, TextField, Typography } from '@mui/material'

export interface ExpandTextDialogProps {
    open: boolean
    value: string
    title?: string
    placeholder?: string
    disabled?: boolean
    onConfirm: (value: string) => void
    onCancel: () => void
}

/**
 * A reusable expand dialog for editing long text content in a larger viewport.
 * Used by NodeInputHandler (multiline string fields) and MessagesInput (message content).
 */
export function ExpandTextDialog({ open, value, title, placeholder, disabled = false, onConfirm, onCancel }: ExpandTextDialogProps) {
    const [localValue, setLocalValue] = useState(value)

    // Sync local state when dialog opens with a new value
    useEffect(() => {
        if (open) {
            setLocalValue(value)
        }
    }, [open, value])

    const handleConfirm = useCallback(() => {
        onConfirm(localValue)
    }, [localValue, onConfirm])

    return (
        <Dialog open={open} fullWidth maxWidth='md'>
            <DialogContent>
                {title && (
                    <Typography variant='h6' sx={{ mb: 2 }}>
                        {title}
                    </Typography>
                )}
                <TextField
                    fullWidth
                    multiline
                    minRows={12}
                    value={localValue}
                    disabled={disabled}
                    onChange={(e) => setLocalValue(e.target.value)}
                    placeholder={placeholder}
                    data-testid='expand-content-input'
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <Button variant='contained' disabled={disabled} onClick={handleConfirm}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}
