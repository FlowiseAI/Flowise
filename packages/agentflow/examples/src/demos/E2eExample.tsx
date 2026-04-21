/**
 * E2E Example
 *
 * Demonstrates a full end-to-end integration with a live Flowise instance:
 * - Load a saved flow from the database via VITE_FLOW_ID
 * - Editable flow title (synced to DB on save)
 * - Save flow to DB (creates new chatflow if no ID is configured)
 * - Delete chatflow from DB
 * - Test Run via POST /api/v1/internal-prediction (disabled when flow has validation errors)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { AgentFlowInstance, FlowData, HeaderRenderProps } from '@flowiseai/agentflow'
import { Agentflow } from '@flowiseai/agentflow'
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Fab } from '@mui/material'
import { IconDeviceFloppy, IconPlayerPlay, IconTrash } from '@tabler/icons-react'

import { agentflowId as configuredAgentflowId, apiBaseUrl, token } from '../config'
import { FlowStatePanel } from '../FlowStatePanel'
import { SaveToDbDialog } from '../SaveToDbDialog'
import { TestRunDialog } from '../TestRunDialog'

function makeHeaders(contentType = false): Record<string, string> {
    const h: Record<string, string> = {}
    if (contentType) h['Content-Type'] = 'application/json'
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
}

const credentials: RequestCredentials = token ? 'omit' : 'include'

// ── FABs ───────────────────────────────────────────────────────────────────────

function SaveFab({ onClick }: { onClick: () => void }) {
    return (
        <Fab
            size='small'
            aria-label='Save'
            title='Save'
            onClick={onClick}
            sx={{
                color: 'white',
                backgroundColor: 'success.dark',
                '&:hover': { backgroundColor: 'success.dark', backgroundImage: 'linear-gradient(rgb(0 0 0/10%) 0 0)' }
            }}
        >
            <IconDeviceFloppy size={18} />
        </Fab>
    )
}

function DeleteFab({ agentflowId, onDeleted }: { agentflowId: string; onDeleted: () => void }) {
    const [open, setOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const handleDelete = async () => {
        setDeleting(true)
        setDeleteError(null)
        try {
            const res = await fetch(`${apiBaseUrl}/api/v1/chatflows/${agentflowId}`, {
                method: 'DELETE',
                headers: makeHeaders(),
                credentials
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setOpen(false)
            onDeleted()
        } catch (e) {
            setDeleteError(e instanceof Error ? e.message : 'Delete failed')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <>
            <Fab
                size='small'
                aria-label='Delete'
                title='Delete'
                onClick={() => {
                    setOpen(true)
                    setDeleteError(null)
                }}
                sx={{
                    color: 'white',
                    backgroundColor: 'error.dark',
                    '&:hover': { backgroundColor: 'error.dark', backgroundImage: 'linear-gradient(rgb(0 0 0/10%) 0 0)' }
                }}
            >
                <IconTrash size={18} />
            </Fab>
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth='xs' fullWidth>
                <DialogTitle>Delete chatflow?</DialogTitle>
                <DialogContent>
                    <DialogContentText>This will permanently delete the chatflow from the database.</DialogContentText>
                    {deleteError && <DialogContentText sx={{ color: 'error.main', mt: 1 }}>{deleteError}</DialogContentText>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button onClick={handleDelete} color='error' variant='contained' disabled={deleting}>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

function TestRunFab({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
    return (
        <Fab
            size='small'
            aria-label='Test Run'
            title={disabled ? 'Fix validation errors before running' : 'Test Run'}
            onClick={onClick}
            disabled={disabled}
            sx={{
                color: 'white',
                backgroundColor: disabled ? undefined : 'secondary.dark',
                '&:hover': { backgroundColor: 'secondary.dark', backgroundImage: 'linear-gradient(rgb(0 0 0/10%) 0 0)' }
            }}
        >
            <IconPlayerPlay size={18} />
        </Fab>
    )
}

// ── Editable header (title only) ───────────────────────────────────────────────

function EditableHeader({
    flowName,
    onFlowNameChange,
    isDirty,
    agentflowId,
    saveError
}: HeaderRenderProps & {
    onFlowNameChange: (name: string) => void
    agentflowId?: string
    saveError?: string | null
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(flowName)

    useEffect(() => {
        setDraft(flowName)
    }, [flowName])

    const commit = () => {
        setEditing(false)
        if (draft.trim()) onFlowNameChange(draft.trim())
        else setDraft(flowName)
    }

    return (
        <div style={{ borderBottom: '1px solid #e0e0e0', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px' }}>
                {editing ? (
                    <input
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        value={draft}
                        placeholder='Untitled'
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commit()
                            if (e.key === 'Escape') {
                                setEditing(false)
                                setDraft(flowName)
                            }
                        }}
                        style={{
                            fontSize: '15px',
                            fontWeight: 600,
                            border: 'none',
                            borderBottom: '2px solid #1976d2',
                            outline: 'none',
                            background: 'transparent',
                            minWidth: '160px'
                        }}
                    />
                ) : (
                    <span
                        role='button'
                        tabIndex={0}
                        title='Click to rename'
                        onClick={() => setEditing(true)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setEditing(true)
                        }}
                        style={{ fontSize: '15px', fontWeight: 600, cursor: 'text', userSelect: 'none' }}
                    >
                        {flowName || '<Untitled>'}
                        {isDirty ? ' *' : ''}
                    </span>
                )}
                {(agentflowId || configuredAgentflowId) && !editing && (
                    <span style={{ fontSize: '12px', color: agentflowId ? '#2e7d32' : '#d32f2f', fontFamily: 'monospace' }}>
                        {agentflowId ?? configuredAgentflowId}
                        {!agentflowId && <Chip label='Not found' color='error' size='small' sx={{ ml: 1, height: 18, fontSize: '10px' }} />}
                    </span>
                )}
                {saveError && !editing && (
                    <Chip label={`Save failed: ${saveError}`} color='error' size='small' sx={{ height: 18, fontSize: '10px' }} />
                )}
            </div>
        </div>
    )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function E2eExample() {
    const agentflowRef = useRef<AgentFlowInstance>(null)
    const [flowName, setFlowName] = useState('')
    const [currentFlow, setCurrentFlow] = useState<FlowData | null>(null)
    const [savedFlow, setSavedFlow] = useState<FlowData | null>(null)
    const [changeCount, setChangeCount] = useState(0)
    const [activeChatflowId, setActiveChatflowId] = useState<string | undefined>(undefined)
    const [pendingSaveFlow, setPendingSaveFlow] = useState<FlowData | null>(null)
    const [showTestRun, setShowTestRun] = useState(false)
    const [isFlowValid, setIsFlowValid] = useState(true)
    const [localIsDirty, setLocalIsDirty] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    // Load flow + name from DB when VITE_FLOW_ID is configured.
    // Gate render until fetch settles so Agentflow mounts with the correct initialFlow.
    const [loadedFlow, setLoadedFlow] = useState<FlowData | undefined>(undefined)
    const [loading, setLoading] = useState(!!configuredAgentflowId)
    useEffect(() => {
        if (!configuredAgentflowId) return
        fetch(`${apiBaseUrl}/api/v1/chatflows/${configuredAgentflowId}`, {
            headers: makeHeaders(),
            credentials
        })
            .then((r) => r.json())
            .then((chatflow) => {
                if (chatflow.name) setFlowName(chatflow.name)
                if (chatflow.flowData) {
                    setLoadedFlow(JSON.parse(chatflow.flowData))
                    setActiveChatflowId(configuredAgentflowId)
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const handleFlowChange = useCallback((flow: FlowData) => {
        setCurrentFlow(flow)
        setChangeCount((c) => c + 1)
        setIsFlowValid(agentflowRef.current?.validate().valid ?? true)
        setLocalIsDirty(true)
    }, [])

    const handleSave = useCallback(
        async (flow: FlowData) => {
            setSavedFlow(flow)
            if (!activeChatflowId) {
                setPendingSaveFlow(flow)
                return
            }
            try {
                setSaveError(null)
                const res = await fetch(`${apiBaseUrl}/api/v1/chatflows/${activeChatflowId}`, {
                    method: 'PUT',
                    headers: makeHeaders(true),
                    credentials,
                    body: JSON.stringify({
                        name: flowName,
                        flowData: JSON.stringify({ nodes: flow.nodes, edges: flow.edges, viewport: flow.viewport })
                    })
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
            } catch (e) {
                setSaveError(e instanceof Error ? e.message : 'Save failed')
            }
        },
        [activeChatflowId, flowName] // eslint-disable-line react-hooks/exhaustive-deps
    )

    const handleSaveToDb = useCallback((id: string) => {
        setActiveChatflowId(id)
        setPendingSaveFlow(null)
    }, [])

    const handleSaveFab = useCallback(async () => {
        const flow = agentflowRef.current?.getFlow()
        if (flow) {
            await handleSave(flow)
            setLocalIsDirty(false)
        }
    }, [handleSave])

    const canvasActions = (
        <>
            {activeChatflowId && <TestRunFab onClick={() => setShowTestRun(true)} disabled={!isFlowValid} />}
            <SaveFab onClick={handleSaveFab} />
            {activeChatflowId && <DeleteFab agentflowId={activeChatflowId} onDeleted={() => setActiveChatflowId(undefined)} />}
        </>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {showTestRun && activeChatflowId && <TestRunDialog agentflowId={activeChatflowId} onClose={() => setShowTestRun(false)} />}
            {pendingSaveFlow && (
                <SaveToDbDialog
                    flow={pendingSaveFlow}
                    flowName={flowName}
                    onSaved={handleSaveToDb}
                    onCancel={() => setPendingSaveFlow(null)}
                />
            )}

            {/* Canvas + panels */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ flex: 1 }}>
                    {loading ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: '#888',
                                fontSize: '14px'
                            }}
                        >
                            Loading flow…
                        </div>
                    ) : (
                        <Agentflow
                            ref={agentflowRef}
                            apiBaseUrl={apiBaseUrl}
                            token={token ?? undefined}
                            initialFlow={loadedFlow}
                            onFlowChange={handleFlowChange}
                            onSave={handleSave}
                            canvasActions={canvasActions}
                            renderHeader={(props) => (
                                <EditableHeader
                                    {...props}
                                    isDirty={localIsDirty}
                                    flowName={flowName}
                                    onFlowNameChange={setFlowName}
                                    agentflowId={activeChatflowId}
                                    saveError={saveError}
                                />
                            )}
                            requestInterceptor={(config) => {
                                if (!token) config.withCredentials = true
                                return config
                            }}
                        />
                    )}
                </div>
                <FlowStatePanel currentFlow={currentFlow} savedFlow={savedFlow} changeCount={changeCount} />
            </div>
        </div>
    )
}

export const E2eExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'savedFlow: FlowData | undefined',
    onFlowChange: '(flow: FlowData) => void',
    onSave: '(flow: FlowData) => Promise<void>',
    canvasActions: '<TestRunFab /> <SaveFab /> <DeleteFab />',
    renderHeader: '(props: HeaderRenderProps) => ReactNode',
    requestInterceptor: '(config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig'
}
