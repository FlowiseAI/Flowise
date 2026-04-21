/**
 * TestRunDialog
 *
 * Sends a test question to POST /api/v1/internal-prediction/{agentflowId}
 * and displays the response, letting users verify the flow runs correctly.
 */

import { useState } from 'react'

import MarkdownIt from 'markdown-it'

import { apiBaseUrl, token } from './config'

const md = new MarkdownIt({ linkify: true, breaks: true })

interface TestRunDialogProps {
    agentflowId: string
    onClose: () => void
}

export function TestRunDialog({ agentflowId, onClose }: TestRunDialogProps) {
    const [question, setQuestion] = useState('')
    const [running, setRunning] = useState(false)
    const [result, setResult] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) authHeaders['Authorization'] = `Bearer ${token}`

    const handleRun = async () => {
        if (!question.trim()) return
        setRunning(true)
        setResult(null)
        setError(null)
        try {
            const res = await fetch(`${apiBaseUrl}/api/v1/internal-prediction/${agentflowId}`, {
                method: 'POST',
                headers: authHeaders,
                credentials: token ? 'omit' : 'include',
                body: JSON.stringify({ question: question.trim(), streaming: false })
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            // Response shape: { text, question, chatId, ... }
            setResult(typeof data.text === 'string' ? data.text : JSON.stringify(data, null, 2))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Request failed')
        } finally {
            setRunning(false)
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            role='presentation'
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
            onKeyDown={(e) => {
                if (e.key === 'Escape') onClose()
            }}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    width: '520px',
                    maxWidth: '95vw',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '15px', flex: 1 }}>Test Run</span>
                        <button
                            onClick={onClose}
                            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#666' }}
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>
                        POST /api/v1/internal-prediction/<span style={{ color: '#1976d2' }}>{agentflowId}</span>
                    </div>

                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun()
                        }}
                        placeholder='Enter a question to send to the flow… (⌘+Enter to run)'
                        rows={3}
                        style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '13px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                        }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleRun}
                            disabled={running || !question.trim()}
                            style={{
                                padding: '7px 20px',
                                background: running || !question.trim() ? '#ccc' : '#1976d2',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: running || !question.trim() ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: '13px'
                            }}
                        >
                            {running ? 'Running…' : 'Run'}
                        </button>
                    </div>

                    {error && (
                        <div
                            style={{
                                background: '#fff3f3',
                                border: '1px solid #f5c2c7',
                                borderRadius: '6px',
                                padding: '10px 14px',
                                color: '#d32f2f',
                                fontSize: '13px'
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {result !== null && (
                        <div style={{ background: '#f6f8fa', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '12px 14px' }}>
                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>RESPONSE</div>
                            <div style={{ fontSize: '13px', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: md.render(result) }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
