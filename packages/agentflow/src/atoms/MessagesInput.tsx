import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Box, Button, Chip, IconButton, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconArrowsMaximize, IconPlus, IconTrash, IconVariable } from '@tabler/icons-react'

import type { InputParam, NodeData } from '@/core/types'

import { ExpandTextDialog } from './ExpandTextDialog'

const MESSAGE_ROLES = [
    { label: 'System', value: 'system' },
    { label: 'Assistant', value: 'assistant' },
    { label: 'Developer', value: 'developer' },
    { label: 'User', value: 'user' }
] as const

type MessageRole = (typeof MESSAGE_ROLES)[number]['value']

export interface MessageEntry {
    role: MessageRole
    content: string
}

export interface MessagesInputProps {
    inputParam: InputParam
    data: NodeData
    disabled?: boolean
    onDataChange?: (params: { inputParam: InputParam; newValue: unknown }) => void
}

/**
 * Specialized array input for message entries (Agent + LLM nodes).
 * Each entry has a role dropdown (system/assistant/developer/user)
 * and a multiline content textarea with variable support ({{ variable }} syntax).
 */
export function MessagesInput({ inputParam, data, disabled = false, onDataChange }: MessagesInputProps) {
    const theme = useTheme()
    const idCounterRef = useRef(0)
    const itemKeysRef = useRef<string[]>([])

    const messages = useMemo(
        () => (Array.isArray(data.inputValues?.[inputParam.name]) ? (data.inputValues[inputParam.name] as MessageEntry[]) : []),
        [data.inputValues, inputParam.name]
    )

    // Grow keys array when new items appear (e.g. on mount or external data changes)
    useEffect(() => {
        while (itemKeysRef.current.length < messages.length) {
            itemKeysRef.current.push(`message-${idCounterRef.current++}`)
        }
    }, [messages.length])

    const handleRoleChange = useCallback(
        (index: number, role: string) => {
            const updated = [...messages]
            updated[index] = { ...updated[index], role: role as MessageRole }
            onDataChange?.({ inputParam, newValue: updated })
        },
        [messages, inputParam, onDataChange]
    )

    const handleContentChange = useCallback(
        (index: number, content: string) => {
            const updated = [...messages]
            updated[index] = { ...updated[index], content }
            onDataChange?.({ inputParam, newValue: updated })
        },
        [messages, inputParam, onDataChange]
    )

    const handleAddMessage = useCallback(() => {
        const newMessage: MessageEntry = { role: 'user', content: '' }
        onDataChange?.({ inputParam, newValue: [...messages, newMessage] })
    }, [messages, inputParam, onDataChange])

    const handleDeleteMessage = useCallback(
        (indexToDelete: number) => {
            itemKeysRef.current.splice(indexToDelete, 1)
            onDataChange?.({ inputParam, newValue: messages.filter((_, i) => i !== indexToDelete) })
        },
        [messages, inputParam, onDataChange]
    )

    // Expand dialog state
    const [expandIndex, setExpandIndex] = useState<number | null>(null)

    const handleExpandOpen = useCallback((index: number) => {
        setExpandIndex(index)
    }, [])

    const handleExpandConfirm = useCallback(
        (value: string) => {
            if (expandIndex !== null) {
                handleContentChange(expandIndex, value)
            }
            setExpandIndex(null)
        },
        [expandIndex, handleContentChange]
    )

    const handleExpandCancel = useCallback(() => {
        setExpandIndex(null)
    }, [])

    const isDeleteVisible = !inputParam.minItems || messages.length > inputParam.minItems
    const isAddDisabled = disabled || (!!inputParam.maxItems && messages.length >= inputParam.maxItems)

    return (
        <>
            {/* Section header */}
            <Box sx={{ p: 2, pb: 0 }}>
                <Typography>{inputParam.label}</Typography>
            </Box>

            {messages.map((message, index) => (
                <Box
                    key={itemKeysRef.current[index]}
                    sx={{
                        p: 2,
                        mt: 2,
                        mb: 1,
                        border: 1,
                        borderColor: theme.palette.grey[900] + 25,
                        borderRadius: 2,
                        position: 'relative'
                    }}
                >
                    {/* Delete button — hidden (not just disabled) when at minItems */}
                    {isDeleteVisible && (
                        <IconButton
                            title='Delete'
                            disabled={disabled}
                            onClick={() => handleDeleteMessage(index)}
                            sx={{
                                position: 'absolute',
                                height: '35px',
                                width: '35px',
                                right: 10,
                                top: 10,
                                '&:hover': { color: 'red' }
                            }}
                        >
                            <IconTrash />
                        </IconButton>
                    )}

                    {/* Index chip */}
                    <Chip label={`${index}`} size='small' sx={{ position: 'absolute', right: isDeleteVisible ? 45 : 10, top: 16 }} />

                    {/* Role field */}
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <Typography>
                                Role
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                        </div>
                        <Select
                            fullWidth
                            size='small'
                            value={message.role}
                            disabled={disabled}
                            onChange={(e) => handleRoleChange(index, e.target.value)}
                            sx={{ mt: 1 }}
                            data-testid={`role-select-${index}`}
                        >
                            {MESSAGE_ROLES.map((role) => (
                                <MenuItem key={role.value} value={role.value}>
                                    {role.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>

                    {/* Content field */}
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <Typography>
                                Content
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                            <div style={{ flexGrow: 1 }} />
                            <Tooltip title='Type {{ to select variables'>
                                <IconVariable size={20} style={{ color: 'teal' }} />
                            </Tooltip>
                            <IconButton
                                size='small'
                                sx={{ height: 25, width: 25, ml: 0.5 }}
                                title='Expand'
                                color='primary'
                                disabled={disabled}
                                onClick={() => handleExpandOpen(index)}
                            >
                                <IconArrowsMaximize />
                            </IconButton>
                        </div>
                        <TextField
                            fullWidth
                            multiline
                            minRows={4}
                            size='small'
                            value={message.content}
                            disabled={disabled}
                            onChange={(e) => handleContentChange(index, e.target.value)}
                            placeholder='Message content (supports {{ variable }} syntax)'
                            data-testid={`content-input-${index}`}
                            sx={{ mt: 1 }}
                        />
                    </Box>
                </Box>
            ))}

            {/* Add button */}
            <Button
                fullWidth
                size='small'
                variant='outlined'
                disabled={isAddDisabled}
                sx={{ borderRadius: '16px', mt: 2 }}
                startIcon={<IconPlus />}
                onClick={handleAddMessage}
            >
                Add {inputParam.label}
            </Button>

            {/* Expand content dialog */}
            <ExpandTextDialog
                open={expandIndex !== null}
                value={expandIndex !== null ? messages[expandIndex]?.content ?? '' : ''}
                title='Content'
                placeholder='Message content (supports {{ variable }} syntax)'
                disabled={disabled}
                onConfirm={handleExpandConfirm}
                onCancel={handleExpandCancel}
            />
        </>
    )
}
