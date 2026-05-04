import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'

import { alpha, useTheme } from '@mui/material/styles'
import { Box, IconButton, Menu, MenuItem, OutlinedInput, Tooltip, Typography } from '@mui/material'

import {
    IconChevronDown,
    IconChevronRight,
    IconDots,
    IconFile,
    IconFileCode,
    IconFileText,
    IconFolder,
    IconFolderOpen,
    IconPhoto
} from '@tabler/icons-react'

import { SKILL_ROOT_ID } from '../constants'
import { classifyKind, isImage } from '../utils/extUtils'
import { isNameTaken } from '../utils/treeUtils'
import { validateNodeName } from '../utils/nameValidator'

const iconFor = (node) => {
    if (node.id === SKILL_ROOT_ID) return null
    if (node.node_type === 'folder') return null
    const kind = classifyKind(node.extension)
    if (kind === 'skill') return <IconFileText size={16} />
    if (kind === 'code') return <IconFileCode size={16} />
    if (isImage(node.extension)) return <IconPhoto size={16} />
    if (kind === 'binary') return <IconFile size={16} />
    return <IconFileText size={16} />
}

// One row in the recursive tree. Inline rename is driven by `renaming` prop
// from the parent so exactly one row can be in rename-mode at a time.
const SkillFileTreeNode = ({
    node,
    depth,
    isSelected,
    isExpanded,
    hasChildren,
    onToggle,
    onSelect,
    onRename,
    onRequestRename,
    onRequestCreate,
    onRequestDelete,
    onRequestUpload,
    onDropInto,
    onDropFiles,
    renaming,
    onCancelRename,
    disabled,
    nodes
}) => {
    const theme = useTheme()
    const [menuAnchor, setMenuAnchor] = useState(null)
    const [draft, setDraft] = useState(node.name || '')
    const [renameError, setRenameError] = useState('')
    const inputRef = useRef(null)

    const isRoot = node.id === SKILL_ROOT_ID
    const isFolder = isRoot || node.node_type === 'folder'

    const commitRename = () => {
        const trimmed = (draft || '').trim()
        if (!trimmed || trimmed === node.name) {
            setRenameError('')
            onCancelRename?.()
            return
        }
        const fmtErr = validateNodeName(trimmed)
        if (fmtErr) {
            setRenameError(fmtErr)
            return
        }
        if (isNameTaken(nodes || [], node.parent_id ?? null, trimmed, node.id)) {
            setRenameError(`"${trimmed}" already exists in this folder`)
            return
        }
        setRenameError('')
        onRename?.(node.id, trimmed)
    }

    // Clear any stale error whenever rename mode ends.
    useEffect(() => {
        if (!renaming) setRenameError('')
    }, [renaming])

    // When rename mode activates, focus the input and select all text so the
    // user can immediately type a new name. autoFocus alone is unreliable here
    // because MUI's Menu animation can interfere; a deferred programmatic focus
    // via the ref is the safest approach.
    useEffect(() => {
        if (!renaming) return
        const timer = setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus()
                inputRef.current.select()
            }
        }, 0)
        return () => clearTimeout(timer)
    }, [renaming])

    return (
        <Box
            role='treeitem'
            aria-expanded={isFolder ? isExpanded : undefined}
            aria-selected={isSelected || undefined}
            sx={{
                userSelect: 'none',
                borderRadius: 1,
                transition: 'background-color 0.15s',
                background: isSelected ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
                '&:hover': {
                    background: isSelected ? alpha(theme.palette.primary.main, 0.18) : alpha(theme.palette.action.hover, 0.15)
                },
                '&:hover .skill-row-actions': { opacity: 1 }
            }}
            onDragOver={(e) => {
                if (!isFolder || disabled) return
                e.preventDefault()
            }}
            onDrop={(e) => {
                if (!isFolder || disabled) return
                e.preventDefault()
                // Dropping OS files on a folder row uploads them into it.
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    onDropFiles?.(isRoot ? null : node.id, Array.from(e.dataTransfer.files))
                    return
                }
                const dragId = e.dataTransfer.getData('text/skill-node')
                if (dragId && dragId !== node.id) {
                    onDropInto?.(dragId, isRoot ? null : node.id)
                }
            }}
            draggable={!isRoot && !renaming && !disabled}
            onDragStart={(e) => {
                if (isRoot) return
                e.dataTransfer.setData('text/skill-node', node.id)
                // File nodes can also be dropped onto the Markdown editor as a
                // `{{skill.<nodeId>}}` reference. We expose that via a separate
                // MIME type so the editor can recognise the drop unambiguously,
                // plus a `text/plain` fallback for any generic text target.
                if (node.node_type === 'file') {
                    e.dataTransfer.setData('text/skill-file-ref', node.id)
                    e.dataTransfer.setData('text/plain', `{{skill.${node.id}}}`)
                    e.dataTransfer.effectAllowed = 'copyMove'
                } else {
                    e.dataTransfer.effectAllowed = 'move'
                }
            }}
        >
            <Box
                onClick={() => {
                    if (renaming) return
                    if (isFolder) onToggle?.(node.id)
                    onSelect?.(node.id)
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.5,
                    pl: `${8 + depth * 14}px`,
                    cursor: 'pointer',
                    minHeight: 32
                }}
            >
                {isFolder ? (
                    hasChildren ? (
                        isExpanded ? (
                            <IconChevronDown size={14} />
                        ) : (
                            <IconChevronRight size={14} />
                        )
                    ) : (
                        <Box sx={{ width: 14 }} />
                    )
                ) : (
                    <Box sx={{ width: 14 }} />
                )}
                {isFolder ? (
                    isExpanded ? (
                        <IconFolderOpen size={16} color={theme.palette.primary.main} />
                    ) : (
                        <IconFolder size={16} color={theme.palette.primary.main} />
                    )
                ) : (
                    iconFor(node)
                )}
                {renaming ? (
                    <Tooltip
                        open={!!renameError}
                        title={renameError}
                        placement='bottom-start'
                        arrow
                        componentsProps={{ tooltip: { sx: { fontSize: '0.75rem' } } }}
                    >
                        <OutlinedInput
                            inputRef={inputRef}
                            size='small'
                            value={draft}
                            error={!!renameError}
                            onChange={(e) => {
                                setDraft(e.target.value)
                                if (renameError) setRenameError('')
                            }}
                            onBlur={() => {
                                if (renameError) {
                                    setRenameError('')
                                    onCancelRename?.()
                                    return
                                }
                                commitRename()
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    commitRename()
                                } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    setRenameError('')
                                    onCancelRename?.()
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ flex: 1, height: 24, '& input': { py: 0, fontSize: '0.85rem' } }}
                        />
                    </Tooltip>
                ) : (
                    <Typography
                        variant='body2'
                        sx={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: isRoot ? 600 : 400,
                            color: isRoot ? 'text.secondary' : 'text.primary'
                        }}
                    >
                        {isRoot ? 'Workspace root' : node.name}
                    </Typography>
                )}
                {!renaming && !disabled && (
                    <Box
                        className='skill-row-actions'
                        sx={{ display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.15s' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Tooltip title='Actions'>
                            <IconButton size='small' onClick={(e) => setMenuAnchor(e.currentTarget)}>
                                <IconDots size={14} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </Box>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)} disableRestoreFocus>
                {isFolder && [
                    <MenuItem
                        key='new-file'
                        onClick={() => {
                            setMenuAnchor(null)
                            onRequestCreate?.(isRoot ? null : node.id, 'file')
                        }}
                    >
                        New file
                    </MenuItem>,
                    <MenuItem
                        key='new-folder'
                        onClick={() => {
                            setMenuAnchor(null)
                            onRequestCreate?.(isRoot ? null : node.id, 'folder')
                        }}
                    >
                        New folder
                    </MenuItem>,
                    onRequestUpload ? (
                        <MenuItem
                            key='upload'
                            onClick={() => {
                                setMenuAnchor(null)
                                onRequestUpload?.(isRoot ? null : node.id)
                            }}
                        >
                            Upload files…
                        </MenuItem>
                    ) : null
                ]}
                {!isRoot && [
                    <MenuItem
                        key='rename'
                        onClick={() => {
                            setMenuAnchor(null)
                            setDraft(node.name || '')
                            onRequestRename?.(node.id)
                        }}
                    >
                        Rename
                    </MenuItem>,
                    <MenuItem
                        key='delete'
                        onClick={() => {
                            setMenuAnchor(null)
                            onRequestDelete?.(node.id)
                        }}
                    >
                        Delete
                    </MenuItem>
                ]}
            </Menu>
        </Box>
    )
}

SkillFileTreeNode.propTypes = {
    node: PropTypes.object.isRequired,
    depth: PropTypes.number.isRequired,
    isSelected: PropTypes.bool,
    isExpanded: PropTypes.bool,
    hasChildren: PropTypes.bool,
    onToggle: PropTypes.func,
    onSelect: PropTypes.func,
    onRename: PropTypes.func,
    onRequestRename: PropTypes.func,
    onRequestCreate: PropTypes.func,
    onRequestDelete: PropTypes.func,
    onRequestUpload: PropTypes.func,
    onDropInto: PropTypes.func,
    onDropFiles: PropTypes.func,
    renaming: PropTypes.bool,
    onCancelRename: PropTypes.func,
    disabled: PropTypes.bool,
    nodes: PropTypes.array
}

export default SkillFileTreeNode
