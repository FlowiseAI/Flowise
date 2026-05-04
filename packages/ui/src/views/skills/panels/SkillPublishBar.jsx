import PropTypes from 'prop-types'

import { Box, Button, Chip, CircularProgress, FormControlLabel, Stack, Switch, Tooltip, Typography } from '@mui/material'
import { IconCheck, IconCircleCheck, IconClock, IconDeviceFloppy, IconUpload } from '@tabler/icons-react'

import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'

const fmtDate = (iso) => {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleString()
    } catch {
        return String(iso)
    }
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '')
const SAVE_SHORTCUT = isMac ? '⌘S' : 'Ctrl+S'

// Skill-level status + Publish action, displayed at the top of the editor.
const SkillPublishBar = ({ skill, saving, onPublish, publishing, lastSavedAt, dirty, autoSave, onAutoSaveChange, onManualSave }) => {
    const hasPublished = !!skill?.publishedBundleId
    const showManualSave = !autoSave
    const manualSaveDisabled = saving || !dirty
    return (
        <Stack
            direction='row'
            spacing={2}
            alignItems='center'
            sx={{
                px: 2,
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                flexWrap: 'wrap',
                rowGap: 1
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography variant='subtitle1' noWrap sx={{ fontWeight: 600 }}>
                    {skill?.name || 'Untitled skill'}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                    {hasPublished ? `Bundle ${skill.publishedBundleId.slice(0, 8)}…` : 'Not yet published'}
                </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <Stack direction='row' spacing={1} alignItems='center'>
                {saving ? (
                    <Chip size='small' icon={<CircularProgress size={12} />} label='Saving…' variant='outlined' />
                ) : dirty ? (
                    <Chip size='small' icon={<IconClock size={14} />} label='Unsaved changes' color='warning' variant='outlined' />
                ) : lastSavedAt ? (
                    <Tooltip title={`Last saved ${fmtDate(lastSavedAt)}`}>
                        <Chip size='small' icon={<IconCheck size={14} />} label='Saved' variant='outlined' color='success' />
                    </Tooltip>
                ) : null}
                {hasPublished && (
                    <Chip size='small' icon={<IconCircleCheck size={14} />} label='Published' color='success' variant='outlined' />
                )}
                <Tooltip
                    title={
                        autoSave
                            ? 'Auto-save is on. Changes are saved automatically as you type.'
                            : 'Auto-save is off. Use the Save button or ' + SAVE_SHORTCUT + ' to save changes.'
                    }
                >
                    <FormControlLabel
                        control={<Switch size='small' checked={!!autoSave} onChange={(e) => onAutoSaveChange?.(e.target.checked)} />}
                        label={
                            <Typography variant='caption' sx={{ fontWeight: 500 }}>
                                Auto-save
                            </Typography>
                        }
                        sx={{ mr: 0 }}
                    />
                </Tooltip>
                {showManualSave && (
                    <Tooltip title={manualSaveDisabled ? '' : `Save (${SAVE_SHORTCUT})`}>
                        <span>
                            <Button
                                variant='outlined'
                                size='small'
                                disabled={manualSaveDisabled}
                                onClick={onManualSave}
                                startIcon={saving ? <CircularProgress size={12} color='inherit' /> : <IconDeviceFloppy size={14} />}
                                sx={{ textTransform: 'none' }}
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </Button>
                        </span>
                    </Tooltip>
                )}
                <StyledPermissionButton
                    permissionId='tools:update,tools:create'
                    variant='contained'
                    size='small'
                    disabled={publishing || dirty}
                    onClick={onPublish}
                    startIcon={publishing ? <CircularProgress size={12} color='inherit' /> : <IconUpload size={14} />}
                    sx={{ textTransform: 'none' }}
                >
                    {publishing ? 'Publishing…' : 'Publish'}
                </StyledPermissionButton>
            </Stack>
        </Stack>
    )
}

SkillPublishBar.propTypes = {
    skill: PropTypes.object,
    saving: PropTypes.bool,
    onPublish: PropTypes.func,
    publishing: PropTypes.bool,
    lastSavedAt: PropTypes.string,
    dirty: PropTypes.bool,
    autoSave: PropTypes.bool,
    onAutoSaveChange: PropTypes.func,
    onManualSave: PropTypes.func
}

export default SkillPublishBar
