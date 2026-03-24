import { useCallback, useState } from 'react'

import { Box, Button, Dialog, DialogActions, DialogContent, TextField, Typography } from '@mui/material'

import { CodeInput } from './CodeInput'
import { RichTextEditor } from './RichTextEditor.lazy'

export interface ExpandTextDialogProps {
    open: boolean
    value: string
    title?: string
    placeholder?: string
    disabled?: boolean
    /** The input param type — determines which editor to render. 'string' uses the TipTap RichTextEditor, 'code' renders CodeInput; others fall back to a plain TextField. */
    inputType?: string
    /** Language hint for 'code' mode (e.g. 'javascript', 'python', 'json'). */
    language?: string
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
    inputType = 'string',
    language,
    onConfirm,
    onCancel
}: ExpandTextDialogProps) {
    const [localValue, setLocalValue] = useState(value)
    const [prevOpen, setPrevOpen] = useState(open)

    // Sync localValue synchronously when the dialog opens so the TipTap editor
    // initialises with the correct content (useEffect would leave a one-render
    // gap where localValue is stale, causing the editor to show empty/old text).
    if (open && !prevOpen) {
        setLocalValue(value)
        setPrevOpen(true)
    } else if (!open && prevOpen) {
        setPrevOpen(false)
    }

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
                {inputType === 'code' ? (
                    <CodeInput
                        value={localValue}
                        onChange={setLocalValue}
                        language={language}
                        disabled={disabled}
                        height='calc(100vh - 220px)'
                    />
                ) : inputType === 'string' ? (
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
