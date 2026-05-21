import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    OutlinedInput,
    Stack,
    Typography,
    useTheme
} from '@mui/material'
import { IconBook2, IconEdit, IconExternalLink, IconFileText, IconUpload, IconX } from '@tabler/icons-react'

import { StyledButton } from '@/ui-component/button/StyledButton'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

import skillsApi from '@/api/skills'

import { PRESET_COLORS } from './constants'

// Edit/Delete dialog for an existing Skill row. Mirrors CustomMcpServerDialog's
// view + edit pattern: shows read-only details by default, with a toggle into
// an editable form. Includes Delete (bottom-left) and an "Open Editor" button
// that hands off to the full-screen SkillEditorDrawer for file-tree authoring.
const SkillEditDialog = ({ show, dialogProps, onCancel, onConfirm, onDelete, onOpenEditor }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()
    const theme = useTheme()

    useNotifier()
    const { confirm } = useConfirm()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const data = dialogProps?.data || {}

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [color, setColor] = useState('')
    const [iconSrc, setIconSrc] = useState('')
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        if (!show) return
        setName(data.name || '')
        setDescription(data.description || '')
        setColor(data.color || '')
        setIconSrc(data.iconSrc || '')
        setIsEditing(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, data?.id])

    const flashError = (action, err) => {
        const msg = typeof err?.response?.data === 'object' ? err.response.data.message : err?.response?.data || err?.message
        enqueueSnackbar({
            message: `Failed to ${action} skill: ${msg || 'unknown error'}`,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'error',
                persist: true,
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    const flashSuccess = (msg) => {
        enqueueSnackbar({
            message: msg,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'success',
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    const startEditing = () => setIsEditing(true)

    const cancelEditing = () => {
        setName(data.name || '')
        setDescription(data.description || '')
        setColor(data.color || '')
        setIconSrc(data.iconSrc || '')
        setIsEditing(false)
    }

    const onSave = async () => {
        if (!name.trim() || !data?.id) return
        setSaving(true)
        try {
            const body = {
                name: name.trim(),
                description: description || undefined,
                color: color || undefined,
                iconSrc: iconSrc || undefined
            }
            const resp = await skillsApi.updateSkill(data.id, body)
            flashSuccess('Skill saved')
            setIsEditing(false)
            onConfirm?.(resp.data)
        } catch (err) {
            flashError('save', err)
        } finally {
            setSaving(false)
        }
    }

    const onDeleteClick = async () => {
        if (!data?.id) return
        const ok = await confirm({
            title: 'Delete Skill',
            description: `Delete skill "${data.name}"? This will remove all of its files and cannot be undone.`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        })
        if (!ok) return
        setDeleting(true)
        try {
            await skillsApi.deleteSkill(data.id)
            flashSuccess('Skill deleted')
            onDelete?.(data.id)
        } catch (err) {
            flashError('delete', err)
        } finally {
            setDeleting(false)
        }
    }

    const fileCount = data.fileCount ?? 0
    const hasPublished = !!data.publishedBundleId
    const previewColor = color || data.color || theme.palette.primary.main

    const body = (
        <Dialog fullWidth maxWidth='sm' open={show} onClose={onCancel} aria-labelledby='skill-edit-dialog-title'>
            <DialogTitle sx={{ fontSize: '1rem', p: 3, pb: 0 }} id='skill-edit-dialog-title'>
                <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        {iconSrc ? (
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    flexShrink: 0,
                                    borderRadius: '50%',
                                    backgroundImage: `url(${iconSrc})`,
                                    backgroundSize: 'contain',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center center'
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    flexShrink: 0,
                                    borderRadius: '50%',
                                    background: previewColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <IconBook2 size={20} color='white' />
                            </div>
                        )}
                        <Typography
                            variant='h4'
                            sx={{
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {name || 'Edit Skill'}
                        </Typography>
                    </Box>
                    {!isEditing && (
                        <StyledButton variant='outlined' size='small' startIcon={<IconEdit size={16} />} onClick={startEditing}>
                            Edit
                        </StyledButton>
                    )}
                </Box>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 3, pb: 3, pt: 2 }}>
                {!isEditing ? (
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box>
                            <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                                Name
                            </Typography>
                            <Typography variant='body1'>{name}</Typography>
                        </Box>
                        <Box>
                            <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                                Description
                            </Typography>
                            <Typography variant='body1' sx={{ whiteSpace: 'pre-line', overflowWrap: 'break-word' }}>
                                {description || <span style={{ color: theme.palette.text.disabled }}>—</span>}
                            </Typography>
                        </Box>
                        {iconSrc && (
                            <Box>
                                <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                                    Icon URL
                                </Typography>
                                <Typography variant='body2' sx={{ wordBreak: 'break-all' }}>
                                    {iconSrc}
                                </Typography>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                                size='small'
                                icon={<IconFileText size={14} />}
                                label={`${fileCount} ${fileCount === 1 ? 'file' : 'files'}`}
                                variant='outlined'
                            />
                            {hasPublished ? (
                                <Chip size='small' icon={<IconUpload size={14} />} label='Published' color='success' variant='outlined' />
                            ) : (
                                <Chip size='small' label='Draft' variant='outlined' />
                            )}
                        </Box>
                    </Stack>
                ) : (
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box>
                            <Typography variant='overline'>
                                Name<span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                            <OutlinedInput
                                fullWidth
                                placeholder='Customer Support Playbook'
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </Box>
                        <Box>
                            <Typography variant='overline'>Description</Typography>
                            <OutlinedInput
                                fullWidth
                                multiline
                                rows={3}
                                placeholder='What does this skill do? When should the agent invoke it?'
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </Box>
                        <Box>
                            <Typography variant='overline'>Color</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                {PRESET_COLORS.map((c) => (
                                    <Box
                                        key={c}
                                        onClick={() => setColor(c)}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            background: c,
                                            cursor: 'pointer',
                                            border: color === c ? '3px solid' : '2px solid transparent',
                                            borderColor: color === c ? 'primary.main' : 'transparent',
                                            transition: 'border-color 0.2s',
                                            '&:hover': { opacity: 0.8 }
                                        }}
                                    />
                                ))}
                            </Box>
                            <OutlinedInput
                                sx={{ mt: 1 }}
                                fullWidth
                                size='small'
                                placeholder='#FF6B6B or linear-gradient(...)'
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                            />
                        </Box>
                        <Box>
                            <Typography variant='overline'>Icon URL (optional)</Typography>
                            <OutlinedInput
                                fullWidth
                                size='small'
                                placeholder='https://example.com/icon.png'
                                value={iconSrc}
                                onChange={(e) => setIconSrc(e.target.value)}
                            />
                        </Box>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
                <Box>
                    <StyledPermissionButton
                        permissionId={'tools:delete'}
                        color='error'
                        variant='contained'
                        onClick={onDeleteClick}
                        disabled={deleting || saving}
                    >
                        {deleting ? 'Deleting…' : 'Delete'}
                    </StyledPermissionButton>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {!isEditing ? (
                        <>
                            <StyledButton variant='text' onClick={onCancel}>
                                Close
                            </StyledButton>
                            <StyledPermissionButton
                                permissionId={'tools:update'}
                                variant='contained'
                                startIcon={<IconExternalLink size={16} />}
                                onClick={() => onOpenEditor?.(data)}
                            >
                                Open Editor
                            </StyledPermissionButton>
                        </>
                    ) : (
                        <>
                            <Button variant='outlined' onClick={cancelEditing} disabled={saving}>
                                Cancel
                            </Button>
                            <StyledPermissionButton
                                permissionId={'tools:update'}
                                variant='contained'
                                disabled={saving || !name.trim()}
                                onClick={onSave}
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </StyledPermissionButton>
                        </>
                    )}
                </Box>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    )

    return createPortal(show ? body : null, portalElement)
}

SkillEditDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    onDelete: PropTypes.func,
    onOpenEditor: PropTypes.func
}

export default SkillEditDialog
