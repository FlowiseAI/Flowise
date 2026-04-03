import { useCallback, useRef, useState } from 'react'

import { Box, Button, Dialog, DialogActions, DialogContent, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { IconCode, IconPencil } from '@tabler/icons-react'
import type { Editor } from '@tiptap/react'

import { getEditorMarkdown } from '@/atoms/utils/'

import { CodeInput } from './CodeInput'
import { RichTextEditor } from './RichTextEditor.lazy'
import type { SuggestionItem } from './VariableInput'
import { VariableInput } from './VariableInput'

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
    /** Variable suggestion items for `{{ }}` autocomplete in string mode. When provided, uses VariableInput instead of RichTextEditor. */
    suggestionItems?: SuggestionItem[]
    onConfirm: (value: string) => void
    onCancel: () => void
}

type EditorMode = 'edit' | 'source'

/**
 * A reusable expand dialog for editing long text content in a larger viewport.
 * Used by NodeInputHandler (multiline string fields) and MessagesInput (message content).
 *
 * For `inputType='string'`, an Edit/Source toggle lets users switch between the
 * WYSIWYG TipTap editor and a raw markdown text view.
 */
export function ExpandTextDialog({
    open,
    value,
    title,
    placeholder,
    disabled = false,
    inputType = 'string',
    language,
    suggestionItems,
    onConfirm,
    onCancel
}: ExpandTextDialogProps) {
    const [localValue, setLocalValue] = useState(value)
    const [prevOpen, setPrevOpen] = useState(open)
    const [mode, setMode] = useState<EditorMode>('edit')
    const editorRef = useRef<Editor | null>(null)

    // Sync localValue and reset mode synchronously when the dialog opens so the TipTap
    // editor initialises with the correct content (useEffect would leave a one-render
    // gap where localValue is stale, causing the editor to show empty/old text).
    if (open && !prevOpen) {
        setLocalValue(value)
        setMode('edit')
        setPrevOpen(true)
    } else if (!open && prevOpen) {
        setPrevOpen(false)
    }

    const handleConfirm = useCallback(() => {
        onConfirm(localValue)
    }, [localValue, onConfirm])

    const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: EditorMode | null) => {
        if (!newMode || newMode === mode) return
        // When switching to Source, flush the editor's current state to markdown so the
        // textarea shows markdown rather than a raw HTML string (Gap 3 fix — mirrors PR #6021).
        if (newMode === 'source' && editorRef.current) {
            setLocalValue(getEditorMarkdown(editorRef.current))
        }
        setMode(newMode)
    }

    const isRichText = inputType === 'string'

    return (
        <Dialog open={open} fullWidth maxWidth='md'>
            <DialogContent>
                {(title || isRichText) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: '10px' }}>
                        {title && (
                            <Typography variant='h4' sx={{ flex: 1 }}>
                                {title}
                            </Typography>
                        )}
                        {!title && <Box sx={{ flex: 1 }} />}
                        {isRichText && (
                            <ToggleButtonGroup
                                value={mode}
                                exclusive
                                onChange={handleModeChange}
                                size='small'
                                disabled={disabled}
                                aria-label='editor mode'
                            >
                                <ToggleButton value='edit' aria-label='Edit'>
                                    <IconPencil size='1rem' stroke={1.5} style={{ marginRight: 4 }} />
                                    Edit
                                </ToggleButton>
                                <ToggleButton value='source' aria-label='Source'>
                                    <IconCode size='1rem' stroke={1.5} style={{ marginRight: 4 }} />
                                    Source
                                </ToggleButton>
                            </ToggleButtonGroup>
                        )}
                    </Box>
                )}
                {inputType === 'code' ? (
                    <CodeInput
                        value={localValue}
                        onChange={setLocalValue}
                        language={language}
                        disabled={disabled}
                        height='calc(100vh - 220px)'
                    />
                ) : isRichText ? (
                    mode === 'source' ? (
                        <TextField
                            fullWidth
                            multiline
                            minRows={15}
                            value={localValue}
                            disabled={disabled}
                            onChange={(e) => setLocalValue(e.target.value)}
                            placeholder={placeholder}
                            data-testid='source-input'
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85em' } }}
                        />
                    ) : suggestionItems?.length ? (
                        <VariableInput
                            value={localValue}
                            onChange={setLocalValue}
                            placeholder={placeholder}
                            disabled={disabled}
                            rows={15}
                            autoFocus
                            suggestionItems={suggestionItems}
                            onEditorReady={(editor) => {
                                editorRef.current = editor
                            }}
                        />
                    ) : (
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
                                onEditorReady={(editor) => {
                                    editorRef.current = editor
                                }}
                            />
                        </Box>
                    )
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
