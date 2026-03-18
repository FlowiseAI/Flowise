import { useCallback, useEffect, useState } from 'react'

import { Box, Button, Dialog, DialogActions, DialogContent, TextField, Typography } from '@mui/material'

import { RichTextEditor } from './RichTextEditor.lazy'

export interface ExpandTextDialogProps {
    open: boolean
    value: string
    title?: string
    placeholder?: string
    disabled?: boolean
    /** Editor mode — 'text' renders a plain TextField, 'richtext' renders the TipTap RichTextEditor. */
    mode?: 'text' | 'richtext'
    onConfirm: (value: string) => void
    onCancel: () => void
}

/**
 * A reusable expand dialog for editing long text content in a larger viewport.
 * Used by NodeInputHandler (multiline string fields) and MessagesInput (message content).
 */
export function ExpandTextDialog({
    open,
    value,
    title,
    placeholder,
    disabled = false,
    mode = 'text',
    onConfirm,
    onCancel
}: ExpandTextDialogProps) {
    const [localValue, setLocalValue] = useState(value)

    // Sync local state when the value prop changes while dialog is open
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
                    <Typography variant='h4' sx={{ mb: '10px' }}>
                        {title}
                    </Typography>
                )}
                {mode === 'richtext' ? (
                    <Box
                        sx={{
                            borderRadius: '12px',
                            maxHeight: 'calc(100vh - 220px)',
                            overflowY: 'auto',
                            overflowX: 'hidden'
                        }}
                    >
                        <RichTextEditor
                            value={localValue}
                            onChange={setLocalValue}
                            placeholder={placeholder}
                            disabled={disabled}
                            rows={15}
                            autoFocus
                        />
                    </Box>
                ) : (
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
                )}
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
