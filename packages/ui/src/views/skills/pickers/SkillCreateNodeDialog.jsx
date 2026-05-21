import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'

import { Box, Dialog, DialogActions, DialogContent, DialogTitle, OutlinedInput, Typography } from '@mui/material'

import { StyledButton } from '@/ui-component/button/StyledButton'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'

import { isNameTaken } from '../utils/treeUtils'
import { validateNodeName } from '../utils/nameValidator'

const SkillCreateNodeDialog = ({ open, kind, parentPath, parentId, nodes, onCancel, onConfirm }) => {
    const [name, setName] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open) return
        setName(kind === 'file' ? 'untitled.md' : 'new-folder')
        setError('')
    }, [open, kind])

    const onSubmit = () => {
        const trimmed = name.trim()
        const err = validateNodeName(trimmed)
        if (err) {
            setError(err)
            return
        }
        if (isNameTaken(nodes || [], parentId ?? null, trimmed)) {
            setError(`A ${kind} named "${trimmed}" already exists in this folder`)
            return
        }
        onConfirm?.(trimmed)
    }

    return (
        <Dialog open={!!open} onClose={onCancel} fullWidth maxWidth='xs'>
            <DialogTitle sx={{ fontSize: '1rem' }}>{kind === 'folder' ? 'New folder' : 'New file'}</DialogTitle>
            <DialogContent>
                <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                        Location: <code>{parentPath || '/'}</code>
                    </Typography>
                    <Typography variant='overline'>Name</Typography>
                    <OutlinedInput
                        fullWidth
                        size='small'
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value)
                            if (error) setError('')
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSubmit()
                        }}
                        error={!!error}
                    />
                    {error && (
                        <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.5 }}>
                            {error}
                        </Typography>
                    )}
                    {kind === 'file' && (
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                            Use a <code>.md</code> extension for skill instructions, <code>.json</code> / <code>.txt</code> for data, or{' '}
                            <code>.py</code> / <code>.js</code> for code snippets.
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <StyledButton variant='text' onClick={onCancel}>
                    Cancel
                </StyledButton>
                <StyledPermissionButton permissionId='tools:update,tools:create' variant='contained' onClick={onSubmit}>
                    Create
                </StyledPermissionButton>
            </DialogActions>
        </Dialog>
    )
}

SkillCreateNodeDialog.propTypes = {
    open: PropTypes.bool,
    kind: PropTypes.oneOf(['file', 'folder']),
    parentPath: PropTypes.string,
    parentId: PropTypes.string,
    nodes: PropTypes.array,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default SkillCreateNodeDialog
