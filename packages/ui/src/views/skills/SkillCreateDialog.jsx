import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, OutlinedInput, Stack, Typography } from '@mui/material'

import { StyledButton } from '@/ui-component/button/StyledButton'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'

import useNotifier from '@/utils/useNotifier'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

import skillsApi from '@/api/skills'

import { PRESET_COLORS } from './constants'

// Minimal ADD / EDIT dialog for Skill rows. No file-tree UX lives here —
// tree editing is done inside SkillEditorDrawer after the row exists.
const SkillCreateDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const isAdd = dialogProps?.type === 'ADD'

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [color, setColor] = useState('')
    const [iconSrc, setIconSrc] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        if (!show) return
        if (isAdd) {
            setName('')
            setDescription('')
            setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
            setIconSrc('')
        } else if (dialogProps?.data) {
            setName(dialogProps.data.name || '')
            setDescription(dialogProps.data.description || '')
            setColor(dialogProps.data.color || '')
            setIconSrc(dialogProps.data.iconSrc || '')
        }
    }, [show, isAdd, dialogProps])

    const flashError = (action, err) => {
        const msg = typeof err?.response?.data === 'object' ? err.response.data.message : err?.response?.data || err?.message
        enqueueSnackbar({
            message: `Failed to ${action} skill: ${msg}`,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'error',
                persist: true,
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        Close
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
                        Close
                    </Button>
                )
            }
        })
    }

    const onSubmit = async () => {
        if (!name.trim()) return
        setSaving(true)
        try {
            const body = {
                name: name.trim(),
                description: description || undefined,
                color: color || undefined,
                iconSrc: iconSrc || undefined
            }
            if (isAdd) {
                const resp = await skillsApi.createSkill(body)
                flashSuccess('Skill created')
                onConfirm?.(resp.data)
            } else {
                const resp = await skillsApi.updateSkill(dialogProps.data.id, body)
                flashSuccess('Skill saved')
                onConfirm?.(resp.data)
            }
        } catch (err) {
            flashError(isAdd ? 'create' : 'save', err)
        } finally {
            setSaving(false)
        }
    }

    const disabled = saving || !name.trim()

    const body = (
        <Dialog fullWidth maxWidth='sm' open={show} onClose={onCancel} aria-labelledby='skill-dialog-title'>
            <DialogTitle sx={{ fontSize: '1rem' }} id='skill-dialog-title'>
                {isAdd ? 'Create Skill' : 'Edit Skill'}
            </DialogTitle>
            <DialogContent>
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
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <StyledButton variant='text' onClick={onCancel}>
                    Cancel
                </StyledButton>
                <StyledPermissionButton
                    permissionId={isAdd ? 'tools:create' : 'tools:update,tools:create'}
                    variant='contained'
                    disabled={disabled}
                    onClick={onSubmit}
                >
                    {isAdd ? 'Create' : 'Save'}
                </StyledPermissionButton>
            </DialogActions>
        </Dialog>
    )

    return createPortal(show ? body : null, portalElement)
}

SkillCreateDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default SkillCreateDialog
