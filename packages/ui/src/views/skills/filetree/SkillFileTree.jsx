import PropTypes from 'prop-types'
import { useMemo, useRef, useState } from 'react'

import { Box, Button, Stack } from '@mui/material'
import { IconFilePlus, IconFolderPlus, IconUpload } from '@tabler/icons-react'

import { SKILL_ROOT_ID } from '../constants'
import { childrenOf } from '../utils/treeUtils'
import SkillFileTreeNode from './SkillFileTreeNode'

// Recursive tree container. Consumers drive everything through callbacks:
//   onSelect(nodeId)                        — selection
//   onRename(nodeId, newName)               — commit rename
//   onCreate(parentId, 'file'|'folder')     — ask parent to open the create dialog
//   onDelete(nodeId)                        — ask parent to confirm + delete
//   onMove(nodeId, newParentId | null)      — drag/drop move
//   onUpload(parentId, File[])              — upload OS files into `parentId`
//                                             (null = tree root)
const SkillFileTree = ({ nodes, selectedId, onSelect, onRename, onCreate, onDelete, onMove, onUpload, disabled, rootActions }) => {
    const [expanded, setExpanded] = useState(() => new Set([SKILL_ROOT_ID]))
    const [renamingId, setRenamingId] = useState(null)

    // Hidden file input shared by the "Upload" button and by per-folder
    // context-menu items. `pendingParentRef` carries the target folder id
    // across the async browser file-picker round-trip.
    const fileInputRef = useRef(null)
    const pendingParentRef = useRef(null)

    const openFilePicker = (parentId) => {
        if (disabled || !onUpload) return
        pendingParentRef.current = parentId ?? null
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
            fileInputRef.current.click()
        }
    }

    const handlePickerChange = (e) => {
        const files = e.target.files
        const parentId = pendingParentRef.current
        pendingParentRef.current = null
        if (files && files.length > 0) onUpload?.(parentId, Array.from(files))
    }

    const toggleExpanded = (id) => {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const renderNodes = useMemo(() => {
        const walk = (parentId, depth) => {
            const kids = childrenOf(nodes, parentId)
            const out = []
            for (const n of kids) {
                const isFolder = n.node_type === 'folder'
                const kidsOfN = isFolder ? childrenOf(nodes, n.id) : []
                const isExpanded = expanded.has(n.id)
                out.push(
                    <SkillFileTreeNode
                        key={n.id}
                        node={n}
                        depth={depth}
                        isSelected={selectedId === n.id}
                        isExpanded={isExpanded}
                        hasChildren={kidsOfN.length > 0}
                        onToggle={toggleExpanded}
                        onSelect={onSelect}
                        nodes={nodes}
                        onRename={(id, newName) => {
                            setRenamingId(null)
                            onRename?.(id, newName)
                        }}
                        onRequestRename={(id) => setRenamingId(id)}
                        onRequestCreate={(pid, kind) => onCreate?.(pid, kind)}
                        onRequestDelete={(id) => onDelete?.(id)}
                        onRequestUpload={(pid) => openFilePicker(pid)}
                        onDropInto={(dragId, newParentId) => onMove?.(dragId, newParentId)}
                        onDropFiles={(pid, files) => onUpload?.(pid, files)}
                        renaming={renamingId === n.id}
                        onCancelRename={() => setRenamingId(null)}
                        disabled={disabled}
                    />
                )
                if (isFolder && isExpanded && kidsOfN.length > 0) {
                    out.push(...walk(n.id, depth + 1))
                }
            }
            return out
        }
        return walk(null, 0)
        // `openFilePicker` is stable enough within one render — it only
        // depends on `disabled` / `onUpload`, both already in the deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, selectedId, expanded, renamingId, onSelect, onRename, onCreate, onDelete, onMove, onUpload, disabled])

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }} role='tree'>
            {rootActions !== false && (
                <Stack direction='row' spacing={1} sx={{ px: 1, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                    <Button
                        size='small'
                        variant='outlined'
                        startIcon={<IconFilePlus size={14} />}
                        disabled={disabled}
                        onClick={() => onCreate?.(null, 'file')}
                        sx={{ textTransform: 'none', flex: 1 }}
                    >
                        File
                    </Button>
                    <Button
                        size='small'
                        variant='outlined'
                        startIcon={<IconFolderPlus size={14} />}
                        disabled={disabled}
                        onClick={() => onCreate?.(null, 'folder')}
                        sx={{ textTransform: 'none', flex: 1 }}
                    >
                        Folder
                    </Button>
                    {onUpload && (
                        <Button
                            size='small'
                            variant='outlined'
                            startIcon={<IconUpload size={14} />}
                            disabled={disabled}
                            onClick={() => openFilePicker(null)}
                            sx={{ textTransform: 'none', flex: 1 }}
                        >
                            Upload
                        </Button>
                    )}
                </Stack>
            )}
            <Box
                sx={{ flex: 1, overflowY: 'auto', px: 0.5, pb: 1 }}
                onDragOver={(e) => {
                    if (!disabled) e.preventDefault()
                }}
                onDrop={(e) => {
                    if (disabled) return
                    e.preventDefault()
                    // OS file drops land here when the cursor is not over any
                    // folder row → treat as an upload into the tree root.
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        if (onUpload) onUpload(null, Array.from(e.dataTransfer.files))
                        return
                    }
                    const dragId = e.dataTransfer.getData('text/skill-node')
                    if (dragId) onMove?.(dragId, null)
                }}
            >
                {renderNodes}
            </Box>
            <input ref={fileInputRef} type='file' multiple style={{ display: 'none' }} onChange={handlePickerChange} />
        </Box>
    )
}

SkillFileTree.propTypes = {
    nodes: PropTypes.array.isRequired,
    selectedId: PropTypes.string,
    onSelect: PropTypes.func,
    onRename: PropTypes.func,
    onCreate: PropTypes.func,
    onDelete: PropTypes.func,
    onMove: PropTypes.func,
    onUpload: PropTypes.func,
    disabled: PropTypes.bool,
    rootActions: PropTypes.bool
}

export default SkillFileTree
