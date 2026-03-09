/**
 * API Inspector Example
 *
 * Demonstrates the new modelsApi, toolsApi, credentialsApi, and loadMethodRegistry
 * by calling every endpoint and rendering the raw responses.
 *
 * Uses AgentflowProvider (without the canvas) to access useApiContext().
 */

import { useState } from 'react'

import type { ApiServices, Credential, Model, Tool } from '@flowiseai/agentflow'
import { AgentflowProvider, getLoadMethod, useApiContext } from '@flowiseai/agentflow'

import { apiBaseUrl, token } from '../config'

// ─── Shared state shape ───────────────────────────────────────────────────────

interface ApiState<T> {
    data: T | null
    loading: boolean
    error: string | null
}

function idle<T>(): ApiState<T> {
    return { data: null, loading: false, error: null }
}

function loading<T>(): ApiState<T> {
    return { data: null, loading: true, error: null }
}

function ok<T>(data: T): ApiState<T> {
    return { data, loading: false, error: null }
}

function err<T>(e: unknown): ApiState<T> {
    return { data: null, loading: false, error: e instanceof Error ? e.message : String(e) }
}

// ─── Inner component ──────────────────────────────────────────────────────────

function ApiInspectorInner() {
    const { modelsApi, toolsApi, credentialsApi } = useApiContext()

    // --- "Fetch All" states ---
    const [allModels, setAllModels] = useState<ApiState<Model[]>>(idle())
    const [allTools, setAllTools] = useState<ApiState<Tool[]>>(idle())
    const [allCredentials, setAllCredentials] = useState<ApiState<Credential[]>>(idle())

    // --- Filtered/single states ---
    const [provider, setProvider] = useState('openai')
    const [modelsByProvider, setModelsByProvider] = useState<ApiState<Model[]>>(idle())

    const [toolId, setToolId] = useState('')
    const [toolById, setToolById] = useState<ApiState<Tool>>(idle())

    const [credentialName, setCredentialName] = useState('')
    const [credentialsByName, setCredentialsByName] = useState<ApiState<Credential[]>>(idle())

    // --- Registry ---
    const [registryLog, setRegistryLog] = useState<string[]>([])

    // ── Fetch All ──────────────────────────────────────────────────────────────
    const fetchAll = async () => {
        setAllModels(loading())
        setAllTools(loading())
        setAllCredentials(loading())

        await Promise.allSettled([
            modelsApi
                .getChatModels()
                .then((data) => {
                    setAllModels(ok(data))
                })
                .catch((e) => setAllModels(err(e))),

            toolsApi
                .getAllTools()
                .then((data) => {
                    setAllTools(ok(data))
                    if (data.length > 0 && !toolId) setToolId(data[0].id)
                })
                .catch((e) => setAllTools(err(e))),

            credentialsApi
                .getAllCredentials()
                .then((data) => {
                    setAllCredentials(ok(data))
                    if (data.length > 0 && !credentialName) setCredentialName(data[0].credentialName)
                })
                .catch((e) => setAllCredentials(err(e)))
        ])
    }

    // ── Filtered / single ─────────────────────────────────────────────────────
    const fetchModelsByProvider = async () => {
        setModelsByProvider(loading())
        try {
            const data = await modelsApi.getModelsByProvider(provider)
            setModelsByProvider(ok(data))
        } catch (e) {
            setModelsByProvider(err(e))
        }
    }

    const fetchToolById = async () => {
        setToolById(loading())
        try {
            const data = await toolsApi.getToolById(toolId)
            setToolById(ok(data))
        } catch (e) {
            setToolById(err(e))
        }
    }

    const fetchCredentialsByName = async () => {
        setCredentialsByName(loading())
        try {
            const data = await credentialsApi.getCredentialsByName(credentialName)
            setCredentialsByName(ok(data))
        } catch (e) {
            setCredentialsByName(err(e))
        }
    }

    // ── Registry ──────────────────────────────────────────────────────────────
    const testRegistry = async () => {
        const log: string[] = []
        const apis: ApiServices = { modelsApi, toolsApi, credentialsApi }

        const cases: Array<[string, Record<string, unknown>?]> = [
            ['listModels'],
            ['listTools'],
            ['listCredentials', credentialName ? { name: credentialName } : undefined],
            ['unknownMethod']
        ]

        for (const [key, params] of cases) {
            const fn = getLoadMethod(key)
            if (!fn) {
                log.push(`getLoadMethod('${key}') → undefined (expected for unknown keys)`)
                continue
            }
            try {
                const result = await fn(apis, params)
                const count = Array.isArray(result) ? result.length : '(single item)'
                log.push(`getLoadMethod('${key}')${params ? ` params=${JSON.stringify(params)}` : ''} → ${count} item(s)`)
            } catch (e) {
                log.push(`getLoadMethod('${key}') → error: ${e instanceof Error ? e.message : String(e)}`)
            }
        }

        setRegistryLog(log)
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '24px', fontFamily: 'monospace', fontSize: '13px', height: '100%', overflow: 'auto' }}>
            <h2 style={{ fontFamily: 'sans-serif', marginTop: 0 }}>API Inspector</h2>
            <p style={{ fontFamily: 'sans-serif', color: '#666', marginBottom: '24px' }}>
                Tests every endpoint in <code>modelsApi</code>, <code>toolsApi</code>, <code>credentialsApi</code>, and{' '}
                <code>loadMethodRegistry</code> against <strong>{apiBaseUrl}</strong>
            </p>

            {/* ── Section 1: Fetch All ── */}
            <SectionHeader>1 — Fetch All (list endpoints)</SectionHeader>
            <div style={{ marginBottom: '16px' }}>
                <ActionButton onClick={fetchAll} color='#1976d2'>
                    Fetch All APIs
                </ActionButton>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <ResultPanel title='modelsApi.getChatModels()' state={allModels} />
                <ResultPanel title='toolsApi.getAllTools()' state={allTools} />
                <ResultPanel title='credentialsApi.getAllCredentials()' state={allCredentials} />
            </div>

            {/* ── Section 2: Filtered / single ── */}
            <SectionHeader>2 — Filtered / single endpoints</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px', gridAutoRows: '1fr' }}>
                {/* getModelsByProvider */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '360px', minWidth: 0 }}>
                    <FilteredInput
                        label='Provider'
                        value={provider}
                        onChange={setProvider}
                        buttonLabel='getModelsByProvider'
                        onFetch={fetchModelsByProvider}
                        color='#7b1fa2'
                    />
                    <ResultPanel title={`modelsApi.getModelsByProvider('${provider}')`} state={modelsByProvider} flex />
                </div>

                {/* getToolById */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '360px', minWidth: 0 }}>
                    <FilteredInput
                        label='Tool ID'
                        value={toolId}
                        onChange={setToolId}
                        placeholder='auto-filled after Fetch All'
                        buttonLabel='getToolById'
                        onFetch={fetchToolById}
                        color='#e65100'
                    />
                    <ResultPanel title={`toolsApi.getToolById('${toolId || '…'}')`} state={toolById} flex />
                </div>

                {/* getCredentialsByName */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '360px', minWidth: 0 }}>
                    <FilteredInput
                        label='Credential name'
                        value={credentialName}
                        onChange={setCredentialName}
                        placeholder='auto-filled after Fetch All'
                        buttonLabel='getCredentialsByName'
                        onFetch={fetchCredentialsByName}
                        color='#00695c'
                    />
                    <ResultPanel title={`credentialsApi.getCredentialsByName('${credentialName || '…'}')`} state={credentialsByName} flex />
                </div>
            </div>

            {/* ── Section 3: loadMethodRegistry ── */}
            <SectionHeader>3 — loadMethodRegistry dispatch</SectionHeader>
            <div style={{ marginBottom: '16px' }}>
                <ActionButton onClick={testRegistry} color='#388e3c'>
                    Test loadMethodRegistry
                </ActionButton>
            </div>
            {registryLog.length > 0 && (
                <div
                    style={{
                        background: '#1e1e1e',
                        color: '#d4d4d4',
                        padding: '16px',
                        borderRadius: '6px',
                        lineHeight: '1.8'
                    }}
                >
                    {registryLog.map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <h3
            style={{
                fontFamily: 'sans-serif',
                margin: '0 0 12px',
                paddingBottom: '8px',
                borderBottom: '2px solid #e0e0e0',
                fontSize: '14px',
                color: '#333'
            }}
        >
            {children}
        </h3>
    )
}

function ActionButton({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '10px 20px',
                background: color,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'sans-serif',
                fontSize: '14px'
            }}
        >
            {children}
        </button>
    )
}

function FilteredInput({
    label,
    value,
    onChange,
    placeholder,
    buttonLabel,
    onFetch,
    color
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    buttonLabel: string
    onFetch: () => void
    color: string
}) {
    return (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
            <input
                type='text'
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder ?? label}
                style={{
                    flex: 1,
                    padding: '7px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                }}
            />
            <button
                onClick={onFetch}
                disabled={!value}
                style={{
                    padding: '7px 12px',
                    background: value ? color : '#ccc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: value ? 'pointer' : 'not-allowed',
                    fontFamily: 'sans-serif',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                }}
            >
                {buttonLabel}
            </button>
        </div>
    )
}

function ResultPanel<T>({ title, state, flex }: { title: string; state: ApiState<T>; flex?: boolean }) {
    return (
        <div
            style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                overflow: 'hidden',
                minWidth: 0,
                ...(flex ? { flex: 1, display: 'flex', flexDirection: 'column' } : {})
            }}
        >
            <div
                style={{
                    padding: '10px 14px',
                    background: '#f5f5f5',
                    borderBottom: '1px solid #e0e0e0',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    fontSize: '11px',
                    color: '#555',
                    wordBreak: 'break-all',
                    flexShrink: 0
                }}
            >
                {title}
            </div>
            <div style={{ padding: '12px', overflow: 'auto', ...(flex ? { flex: 1 } : { maxHeight: '260px' }) }}>
                {state.loading && <span style={{ color: '#999', fontFamily: 'sans-serif' }}>Loading…</span>}
                {state.error && <span style={{ color: '#d32f2f' }}>{state.error}</span>}
                {state.data !== null && !state.loading && (
                    <pre style={{ margin: 0, fontSize: '11px', lineHeight: '1.5' }}>{JSON.stringify(state.data, null, 2)}</pre>
                )}
                {!state.loading && !state.error && state.data === null && (
                    <span style={{ color: '#bbb', fontFamily: 'sans-serif', fontSize: '12px' }}>No data yet</span>
                )}
            </div>
        </div>
    )
}

// ─── Public export ────────────────────────────────────────────────────────────

export function ApiInspectorExample() {
    return (
        <AgentflowProvider apiBaseUrl={apiBaseUrl} token={token ?? undefined}>
            <ApiInspectorInner />
        </AgentflowProvider>
    )
}

export const ApiInspectorExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}'
}
