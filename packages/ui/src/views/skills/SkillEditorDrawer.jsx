import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'

import {
    AppBar,
    Box,
    Breadcrumbs,
    Button,
    CircularProgress,
    Dialog,
    IconButton,
    Slide,
    Tab,
    Tabs,
    Toolbar,
    Tooltip,
    Typography
} from '@mui/material'
import { IconCheck, IconCircleX, IconCode, IconFolder, IconHierarchy3, IconPlugConnected, IconX } from '@tabler/icons-react'

import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

import skillsApi from '@/api/skills'

import { AUTOSAVE_DELAY_MS, SKILL_AUTOSAVE_STORAGE_KEY, SKILL_ROOT_ID } from './constants'
import { indexNodes, pathFor } from './utils/treeUtils'
import { classifyKind, isMarkdown, isTextLike, parseExtFromName } from './utils/extUtils'

import SkillFileTree from './filetree/SkillFileTree'
import SkillContentRouter from './editors/SkillContentRouter'
import SkillPreviewPanel from './panels/SkillPreviewPanel'
import SkillDependenciesPanel from './panels/SkillDependenciesPanel'
import SkillGraphPanel from './panels/SkillGraphPanel'
import SkillPublishBar from './panels/SkillPublishBar'
import SkillCreateNodeDialog from './pickers/SkillCreateNodeDialog'
import SkillFileRefPicker from './pickers/SkillFileRefPicker'
import SkillToolRefPicker from './pickers/SkillToolRefPicker'

// Parses the `fileTree` JSON string returned by GET /skills/:id.
const parseFileTree = (raw) => {
    if (!raw) return []
    if (Array.isArray(raw?.nodes)) return raw.nodes
    try {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
        return Array.isArray(obj?.nodes) ? obj.nodes : []
    } catch {
        return []
    }
}

// Full-screen drawer-style editor for a single Skill row. Rendered from the
// Skills tab after the user picks a skill card. The parent controls
// open/close via `open` and receives `onClose(skillSummary)` when the user
// dismisses so the list can refresh its row.
const SkillEditorDrawer = ({ open, workspaceId, skillId, onClose }) => {
    const dispatch = useDispatch()
    useNotifier()
    const { confirm } = useConfirm()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const flashError = (action, err) => {
        const msg = typeof err?.response?.data === 'object' ? err.response.data.message : err?.response?.data || err?.message
        enqueueSnackbar({
            message: `Failed to ${action}: ${msg || 'unknown error'}`,
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

    const flashInfo = (msg) => {
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

    const [skill, setSkill] = useState(null)
    const [nodes, setNodes] = useState([])
    const [activeNodeId, setActiveNodeId] = useState(null)
    const [activeContent, setActiveContent] = useState('')
    const [activeMeta, setActiveMeta] = useState(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState('')
    const [tab, setTab] = useState('editor')
    const [publishing, setPublishing] = useState(false)
    const [graphVersion, setGraphVersion] = useState(0)
    const [createState, setCreateState] = useState({ open: false, parentId: null, kind: 'file' })
    const [fileRefOpen, setFileRefOpen] = useState(false)
    const [toolRefOpen, setToolRefOpen] = useState(false)
    // Auto-save toggle. Disabled by default for users on slow remote storage
    // (e.g. S3) who would rather batch writes via the manual Save action.
    // Persisted in localStorage so the choice survives reloads.
    const [autoSave, setAutoSave] = useState(() => {
        try {
            const stored = localStorage.getItem(SKILL_AUTOSAVE_STORAGE_KEY)
            if (stored === null) return true
            return stored !== 'false'
        } catch {
            return true
        }
    })
    const insertRef = useRef(null)

    const saveTimerRef = useRef(null)
    const pendingSave = useRef(null)
    const activeNodeRef = useRef(null)
    activeNodeRef.current = activeNodeId

    const nodeIndex = useMemo(() => indexNodes(nodes), [nodes])
    const activeNode = activeNodeId ? nodeIndex.get(activeNodeId) : null
    const activeKind = activeNode && activeNode.node_type === 'file' ? classifyKind(activeNode.extension) : null
    const canEditText = activeKind === 'skill' || activeKind === 'code' || activeKind === 'data'
    // The compiled markdown preview only makes sense for markdown sources;
    // hide the tab entirely for any other file kind (or no selection).
    const showPreviewTab = activeNode?.node_type === 'file' && isMarkdown(activeNode.extension)

    // Resolver used by the Markdown editor to label `{{skill.<nodeId>}}`
    // placeholder chips with the file name instead of the opaque UUID. The
    // callback is memoised on `nodeIndex` so chips refresh when the tree
    // reloads (e.g. after a rename) without churning on every keystroke.
    const resolveFileName = useCallback(
        (nodeId) => {
            const n = nodeIndex.get(nodeId)
            return n?.name || ''
        },
        [nodeIndex]
    )

    // Zero-arg authenticated blob fetcher for the currently-selected node.
    // Memoised so the <MediaViewer> effect doesn't re-fire on every render,
    // only when the target (workspace/skill/node) changes.
    const fetchActiveNodeBlob = useCallback(
        async (signal) => {
            if (!skillId || !activeNodeId) {
                throw new Error('No active node to download')
            }
            const resp = await skillsApi.downloadNodeBinary(skillId, activeNodeId, { signal })
            return resp.data
        },
        [skillId, activeNodeId]
    )

    const reloadSkill = useCallback(async () => {
        if (!open || !skillId) return
        setLoading(true)
        try {
            const resp = await skillsApi.getSkill(skillId)
            setSkill(resp.data)
            const parsed = parseFileTree(resp.data?.fileTree)
            setNodes(parsed)
        } catch (err) {
            flashError('load skill', err)
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, skillId])

    useEffect(() => {
        reloadSkill()
    }, [reloadSkill])

    useEffect(() => {
        if (!open) {
            setSkill(null)
            setNodes([])
            setActiveNodeId(null)
            setActiveContent('')
            setActiveMeta(null)
            setDirty(false)
            setLastSavedAt('')
            setTab('editor')
        }
    }, [open])

    // If the active selection no longer warrants the Preview tab (e.g. the
    // user clicks a non-markdown file while Preview was open), snap back to
    // the Editor tab so the content area doesn't render against a tab that's
    // about to disappear from the bar.
    useEffect(() => {
        if (tab === 'preview' && !showPreviewTab) {
            setTab('editor')
        }
    }, [tab, showPreviewTab])

    // Load the content of the selected node.
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            if (!open || !skillId || !activeNodeId) {
                setActiveContent('')
                setActiveMeta(null)
                return
            }
            const node = nodeIndex.get(activeNodeId)
            if (!node || node.node_type !== 'file') {
                setActiveContent('')
                setActiveMeta(null)
                return
            }
            try {
                const resp = await skillsApi.getNode(skillId, activeNodeId)
                if (cancelled || activeNodeRef.current !== activeNodeId) return
                setActiveContent(resp.data?.content ?? '')
                setActiveMeta(resp.data?.meta ?? null)
                setDirty(false)
            } catch (err) {
                if (!cancelled) flashError('load node', err)
            }
        }
        load()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeNodeId, skillId, open])

    // Flush any pending autosave before unmounting / closing.
    const flushSave = useCallback(async () => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current)
            saveTimerRef.current = null
        }
        if (pendingSave.current) {
            const { nodeId, content } = pendingSave.current
            pendingSave.current = null
            try {
                setSaving(true)
                await skillsApi.updateNode(skillId, nodeId, { content })
                setDirty(false)
                setLastSavedAt(new Date().toISOString())
            } catch (err) {
                flashError('save content', err)
            } finally {
                setSaving(false)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skillId])

    const scheduleSave = useCallback(
        (nodeId, content) => {
            pendingSave.current = { nodeId, content }
            // In manual mode we still record the pending payload above so that
            // the manual Save button, file switch, and close-flush paths can
            // pick it up — we just don't arm the debounced timer.
            if (!autoSave) return
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            saveTimerRef.current = setTimeout(() => {
                flushSave()
            }, AUTOSAVE_DELAY_MS)
        },
        [flushSave, autoSave]
    )

    const onEditContent = (next) => {
        setActiveContent(next)
        setDirty(true)
        if (activeNodeId) scheduleSave(activeNodeId, next)
    }

    const onBlurEditor = () => {
        // Force a save when the user leaves the editor (snappier than waiting
        // for the debounce). Skipped in manual mode so blur events don't
        // sneak past the user's explicit "save when I say so" preference.
        if (!autoSave) return
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current)
            saveTimerRef.current = null
            flushSave()
        }
    }

    const handleAutoSaveChange = useCallback((next) => {
        setAutoSave(next)
        try {
            localStorage.setItem(SKILL_AUTOSAVE_STORAGE_KEY, String(next))
        } catch {
            // Best-effort persistence; storage may be disabled (private mode).
        }
    }, [])

    const handleManualSave = useCallback(async () => {
        if (saving) return
        await flushSave()
    }, [flushSave, saving])

    // Wrap setActiveNodeId so user-driven file switches first flush any
    // pending edits. Without this, switching files in manual mode would lose
    // unsaved changes when the load effect overwrites `activeContent`.
    const handleSelectActiveNode = useCallback(
        async (id) => {
            if (id === activeNodeId) return
            if (pendingSave.current || saveTimerRef.current) {
                await flushSave()
            }
            setActiveNodeId(id)
        },
        [activeNodeId, flushSave]
    )

    // Cmd/Ctrl+S shortcut — saves regardless of mode. Active only while the
    // drawer is open so it doesn't intercept the rest of the app.
    useEffect(() => {
        if (!open) return undefined
        const onKeyDown = (e) => {
            const isSave = (e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')
            if (!isSave) return
            e.preventDefault()
            handleManualSave()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [open, handleManualSave])

    // ----- Tree actions -----

    const openCreate = (parentId, kind) => setCreateState({ open: true, parentId, kind })

    const submitCreate = async (name) => {
        const { parentId, kind } = createState
        setCreateState({ open: false, parentId: null, kind: 'file' })
        if (!name) return
        try {
            const body = { parentId, name, node_type: kind }
            if (kind === 'file') {
                // Seed empty content so the payload exists server-side.
                body.content = ''
            }
            const resp = await skillsApi.createNode(skillId, body)
            flashInfo(`${kind === 'folder' ? 'Folder' : 'File'} created`)
            await reloadSkill()
            if (kind === 'file') setActiveNodeId(resp.data?.id)
        } catch (err) {
            flashError('create node', err)
        }
    }

    const handleRename = async (nodeId, newName) => {
        try {
            await skillsApi.updateNode(skillId, nodeId, { name: newName })
            await reloadSkill()
        } catch (err) {
            flashError('rename node', err)
        }
    }

    const handleDelete = async (nodeId) => {
        const node = nodeIndex.get(nodeId)
        if (!node) return
        const isFolder = node.node_type === 'folder'
        const hasKids = nodes.some((n) => n.parent_id === nodeId)
        const payload = {
            title: `Delete ${isFolder ? 'folder' : 'file'}`,
            description: `Delete "${node.name}"${hasKids ? ' and all its contents' : ''}? This cannot be undone.`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const ok = await confirm(payload)
        if (!ok) return
        try {
            await skillsApi.deleteNode(skillId, nodeId, hasKids)
            if (activeNodeId === nodeId) {
                setActiveNodeId(null)
                setActiveContent('')
            }
            flashInfo('Deleted')
            await reloadSkill()
        } catch (err) {
            flashError('delete node', err)
        }
    }

    const handleMove = async (dragId, newParentId) => {
        if (dragId === newParentId) return
        try {
            await skillsApi.updateNode(skillId, dragId, { parentId: newParentId })
            await reloadSkill()
        } catch (err) {
            flashError('move node', err)
        }
    }

    // ----- Upload -----

    // Names must match backend regex /^[A-Za-z0-9._-]+$/. Spaces, parens,
    // unicode, etc. from the OS file name get replaced with underscores.
    const sanitizeUploadName = (raw) => {
        const trimmed = (raw || '').trim()
        const cleaned = trimmed
            .replace(/[^A-Za-z0-9._-]+/g, '_')
            .replace(/^[._]+/, '')
            .replace(/_+$/, '')
        return cleaned || 'file'
    }

    // Resolve name collisions by appending "-1", "-2", … before the extension.
    // `reserved` tracks names minted during a single upload batch so two files
    // with the same OS name don't collide with each other before reloadSkill.
    const nextFreeName = (parentId, base, reserved) => {
        const pid = parentId === SKILL_ROOT_ID ? null : parentId ?? null
        const exists = (candidate) => {
            const lc = candidate.toLowerCase()
            if (reserved.has(`${pid || ''}::${lc}`)) return true
            return nodes.some((n) => (n.parent_id || null) === pid && (n.name || '').toLowerCase() === lc)
        }
        if (!exists(base)) {
            reserved.add(`${pid || ''}::${base.toLowerCase()}`)
            return base
        }
        const dot = base.lastIndexOf('.')
        const stem = dot > 0 ? base.slice(0, dot) : base
        const ext = dot > 0 ? base.slice(dot) : ''
        let i = 1
        while (i < 9999) {
            const candidate = `${stem}-${i}${ext}`
            if (!exists(candidate)) {
                reserved.add(`${pid || ''}::${candidate.toLowerCase()}`)
                return candidate
            }
            i += 1
        }
        // Pathological fallback; should never happen in practice.
        return `${stem}-${Date.now()}${ext}`
    }

    const handleUpload = async (parentId, files) => {
        if (!files || !files.length) return
        const normalizedParent = parentId === SKILL_ROOT_ID ? null : parentId ?? null
        const reserved = new Set()
        let successCount = 0
        let lastCreatedId = null
        for (const file of files) {
            const ext = parseExtFromName(file.name)
            const sanitized = sanitizeUploadName(file.name)
            const name = nextFreeName(normalizedParent, sanitized, reserved)
            try {
                if (isTextLike(ext)) {
                    // Read text files client-side and post them through
                    // createNode so they go through the normal text payload
                    // path (the backend rejects text kinds from /upload).
                    const text = await file.text()
                    const resp = await skillsApi.createNode(skillId, {
                        parentId: normalizedParent,
                        name,
                        node_type: 'file',
                        content: text
                    })
                    lastCreatedId = resp.data?.id || lastCreatedId
                } else {
                    // Binary path: create the node first (no content), then
                    // push bytes via the multipart upload endpoint.
                    const createResp = await skillsApi.createNode(skillId, {
                        parentId: normalizedParent,
                        name,
                        node_type: 'file'
                    })
                    const newId = createResp.data?.id
                    if (!newId) throw new Error('createNode returned no id')
                    const fd = new FormData()
                    fd.append('files', file, name)
                    await skillsApi.uploadNodeBinary(skillId, newId, fd)
                    lastCreatedId = newId
                }
                successCount += 1
            } catch (err) {
                flashError(`upload ${file.name}`, err)
            }
        }
        if (successCount > 0) {
            flashInfo(`Uploaded ${successCount} file${successCount > 1 ? 's' : ''}`)
            await reloadSkill()
            if (lastCreatedId) setActiveNodeId(lastCreatedId)
        }
    }

    // ----- Publish -----

    const handlePublish = async () => {
        await flushSave()
        setPublishing(true)
        try {
            const resp = await skillsApi.publishSkill(skillId)
            flashInfo(`Published bundle ${resp.data?.bundleId?.slice(0, 8) || ''}`)
            await reloadSkill()
            setGraphVersion((v) => v + 1)
        } catch (err) {
            flashError('publish skill', err)
        } finally {
            setPublishing(false)
        }
    }

    // ----- Close handling -----

    const handleClose = async () => {
        if (dirty || pendingSave.current || saveTimerRef.current) {
            await flushSave()
        }
        onClose?.(skill)
    }

    // ----- Render -----

    const activePath = activeNode ? pathFor(nodes, activeNodeId) : '/'

    return (
        <Dialog
            open={!!open}
            onClose={handleClose}
            fullScreen
            TransitionComponent={Slide}
            TransitionProps={{ direction: 'up' }}
            PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
        >
            <AppBar color='default' position='relative' elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Toolbar>
                    <Typography variant='h4' sx={{ fontWeight: 600, flex: 1 }}>
                        Skill editor
                    </Typography>
                    <Tooltip title='Close'>
                        <IconButton edge='end' onClick={handleClose}>
                            <IconCircleX size={20} />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>
            <SkillPublishBar
                skill={skill}
                saving={saving}
                dirty={dirty}
                lastSavedAt={lastSavedAt}
                onPublish={handlePublish}
                publishing={publishing}
                autoSave={autoSave}
                onAutoSaveChange={handleAutoSaveChange}
                onManualSave={handleManualSave}
            />
            <Box sx={{ display: 'flex', flex: 1, minHeight: 0, width: '100%' }}>
                <Box
                    sx={{
                        width: 300,
                        minWidth: 240,
                        borderRight: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                >
                    {!skill ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                            <CircularProgress size={20} />
                        </Box>
                    ) : (
                        <SkillFileTree
                            nodes={nodes}
                            selectedId={activeNodeId}
                            onSelect={handleSelectActiveNode}
                            onRename={handleRename}
                            onCreate={openCreate}
                            onDelete={handleDelete}
                            onMove={handleMove}
                            onUpload={handleUpload}
                        />
                    )}
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
                    <Box sx={{ px: 2, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Breadcrumbs separator='/' sx={{ fontSize: '1rem' }}>
                            <Typography variant='caption' sx={{ fontWeight: 600 }}>
                                {skill?.name || 'Skill'}
                            </Typography>
                            {activePath
                                .split('/')
                                .filter(Boolean)
                                .map((seg, i, arr) => (
                                    <Typography key={`${seg}-${i}`} variant='caption' sx={{ fontWeight: i === arr.length - 1 ? 600 : 400 }}>
                                        {seg}
                                    </Typography>
                                ))}
                        </Breadcrumbs>
                    </Box>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable' scrollButtons='auto' sx={{ minHeight: 48 }}>
                            <Tab
                                value='editor'
                                icon={<IconCode size={16} />}
                                iconPosition='start'
                                label='Editor'
                                sx={{ textTransform: 'none', minHeight: 48 }}
                            />
                            {showPreviewTab && (
                                <Tab
                                    value='preview'
                                    icon={<IconCheck size={16} />}
                                    iconPosition='start'
                                    label='Preview'
                                    sx={{ textTransform: 'none', minHeight: 48 }}
                                />
                            )}
                            <Tab
                                value='dependencies'
                                icon={<IconPlugConnected size={16} />}
                                iconPosition='start'
                                label='Dependencies'
                                sx={{ textTransform: 'none', minHeight: 48 }}
                            />
                            <Tab
                                value='graph'
                                icon={<IconHierarchy3 size={16} />}
                                iconPosition='start'
                                label='Graph'
                                sx={{ textTransform: 'none', minHeight: 48 }}
                            />
                        </Tabs>
                    </Box>
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                        {tab === 'editor' && (
                            <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
                                {!activeNodeId ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flex: 1,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            p: 3,
                                            flexDirection: 'column',
                                            gap: 1
                                        }}
                                    >
                                        <IconFolder size={32} color='#888' />
                                        <Typography variant='body2' color='text.secondary'>
                                            Select a file in the tree, or create a new file to start authoring.
                                        </Typography>
                                    </Box>
                                ) : activeNode?.node_type === 'folder' ? (
                                    <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', p: 3 }}>
                                        <Typography variant='body2' color='text.secondary'>
                                            Folder selected. Open a file to edit its contents.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <SkillContentRouter
                                        ref={insertRef}
                                        node={activeNode}
                                        content={activeContent}
                                        onChange={onEditContent}
                                        onBlur={onBlurEditor}
                                        disabled={!canEditText && activeKind !== null}
                                        fetchBlob={fetchActiveNodeBlob}
                                        onRequestInsertFile={(insertAt) => {
                                            insertRef.current = { insertAtCursor: insertAt }
                                            setFileRefOpen(true)
                                        }}
                                        onRequestInsertTool={(insertAt) => {
                                            insertRef.current = { insertAtCursor: insertAt }
                                            setToolRefOpen(true)
                                        }}
                                        resolveFileName={resolveFileName}
                                    />
                                )}
                            </Box>
                        )}
                        {tab === 'preview' && showPreviewTab && <SkillPreviewPanel skillId={skillId} selectedNodeId={activeNodeId} />}
                        {tab === 'dependencies' && <SkillDependenciesPanel skillId={skillId} selectedNodeId={activeNodeId} nodes={nodes} />}
                        {tab === 'graph' && (
                            <SkillGraphPanel
                                skillId={skillId}
                                hasPublished={!!skill?.publishedBundleId}
                                onSelectNode={async (nodeId) => {
                                    await handleSelectActiveNode(nodeId)
                                    setTab('editor')
                                }}
                                refreshKey={graphVersion}
                            />
                        )}
                    </Box>
                </Box>
            </Box>

            <SkillCreateNodeDialog
                open={createState.open}
                kind={createState.kind}
                parentPath={createState.parentId ? pathFor(nodes, createState.parentId) : '/'}
                parentId={createState.parentId}
                nodes={nodes}
                onCancel={() => setCreateState({ open: false, parentId: null, kind: 'file' })}
                onConfirm={submitCreate}
            />
            <SkillFileRefPicker
                open={fileRefOpen}
                nodes={nodes}
                onClose={() => setFileRefOpen(false)}
                onPick={(text) => {
                    insertRef.current?.insertAtCursor?.(text)
                }}
            />
            <SkillToolRefPicker
                open={toolRefOpen}
                onClose={() => setToolRefOpen(false)}
                onPick={(text) => {
                    insertRef.current?.insertAtCursor?.(text)
                }}
            />
            <ConfirmDialog />
        </Dialog>
    )
}

SkillEditorDrawer.propTypes = {
    open: PropTypes.bool,
    workspaceId: PropTypes.string,
    skillId: PropTypes.string,
    onClose: PropTypes.func
}

export default SkillEditorDrawer
