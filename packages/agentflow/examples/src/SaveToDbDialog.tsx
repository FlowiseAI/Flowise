/**
 * SaveToDbDialog
 *
 * Shown when the user clicks Save and no VITE_FLOW_ID is configured.
 * Creates a new agentflow via POST /api/v1/chatflows and reports the new ID.
 */

import { useState } from 'react'

import type { FlowData } from '@flowiseai/agentflow'

import { apiBaseUrl, token } from './config'

interface SaveToDbDialogProps {
    flow: FlowData
    flowName: string
    onSaved: (agentflowId: string) => void
    onCancel: () => void
}

export function SaveToDbDialog({ flow, flowName, onSaved, onCancel }: SaveToDbDialogProps) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) authHeaders['Authorization'] = `Bearer ${token}`

    const handleConfirm = async () => {
        setSaving(true)
        setError(null)
        try {
            const body = {
                name: flowName,
                type: 'AGENTFLOW',
                flowData: JSON.stringify({ nodes: flow.nodes, edges: flow.edges, viewport: flow.viewport })
            }
            const res = await fetch(`${apiBaseUrl}/api/v1/chatflows`, {
                method: 'POST',
                headers: authHeaders,
                credentials: token ? 'omit' : 'include',
                body: JSON.stringify(body)
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const created = await res.json()
            onSaved(created.id)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Save failed')
            setSaving(false)
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <div
                style={{
                    background: '#1e1e2e',
                    border: '1px solid #313244',
                    borderRadius: '8px',
                    padding: '24px 28px',
                    maxWidth: '400px',
                    width: '90%',
                    fontFamily: 'monospace',
                    color: '#cdd6f4'
                }}
            >
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: '#f9e2af' }}>Save flow to database?</div>
                <div style={{ fontSize: '13px', color: '#a6adc8', marginBottom: '20px', lineHeight: 1.6 }}>
                    No <span style={{ color: '#f9e2af' }}>VITE_FLOW_ID</span> is configured. The current flow will be saved to the database
                    as a new agentflow.
                </div>
                {error && <div style={{ color: '#f38ba8', fontSize: '12px', marginBottom: '12px' }}>Error: {error}</div>}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        style={{
                            padding: '6px 16px',
                            background: '#45475a',
                            color: '#cdd6f4',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            opacity: saving ? 0.5 : 1
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={saving}
                        style={{
                            padding: '6px 16px',
                            background: '#a6e3a1',
                            color: '#1e1e2e',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            fontWeight: 700,
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? 'Saving…' : 'Save to DB'}
                    </button>
                </div>
            </div>
        </div>
    )
}
