/**
 * FlowStatePanel Component
 *
 * Displays live onFlowChange data and saved flow snapshots
 * in a dark-themed, resizable side panel with copy support.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { FlowData } from '@flowiseai/agentflow'

interface FlowStatePanelProps {
    currentFlow: FlowData | null
    savedFlow: FlowData | null
    changeCount: number
}

export function FlowStatePanel({ currentFlow, savedFlow, changeCount }: FlowStatePanelProps) {
    const [tab, setTab] = useState<'live' | 'saved'>('live')
    const [copied, setCopied] = useState(false)
    const [width, setWidth] = useState(300)
    const dragging = useRef(false)
    const flow = tab === 'live' ? currentFlow : savedFlow

    const startX = useRef(0)
    const startWidth = useRef(0)

    const resizeBy = useCallback((delta: number) => {
        setWidth((w) => Math.max(200, Math.min(800, w + delta)))
    }, [])

    const onMouseMove = useCallback((moveEvent: MouseEvent) => {
        if (!dragging.current) return
        const newWidth = Math.max(200, Math.min(800, startWidth.current + (startX.current - moveEvent.clientX)))
        setWidth(newWidth)
    }, [])

    const onMouseUp = useCallback(() => {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
    }, [onMouseMove])

    // Clean up global listeners on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
    }, [onMouseMove, onMouseUp])

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            dragging.current = true
            startX.current = e.clientX
            startWidth.current = width

            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
        },
        [width, onMouseMove, onMouseUp]
    )

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault()
                resizeBy(-20)
            } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                resizeBy(20)
            }
        },
        [resizeBy]
    )

    return (
        <div
            style={{
                width: `${width}px`,
                minHeight: 0,
                background: '#1e1e2e',
                color: '#cdd6f4',
                display: 'flex',
                flexDirection: 'column',
                fontSize: '13px',
                fontFamily: 'monospace',
                borderLeft: '1px solid #313244',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Drag handle */}
            <button
                aria-label='Resize panel'
                onMouseDown={handleMouseDown}
                onKeyDown={handleKeyDown}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    cursor: 'col-resize',
                    zIndex: 10,
                    padding: 0,
                    border: 'none',
                    background: 'transparent'
                }}
            />
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #313244' }}>
                <button
                    onClick={() => setTab('live')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: tab === 'live' ? '#313244' : 'transparent',
                        color: tab === 'live' ? '#cba6f7' : '#6c7086',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: 600
                    }}
                >
                    onFlowChange ({changeCount})
                </button>
                <button
                    onClick={() => setTab('saved')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: tab === 'saved' ? '#313244' : 'transparent',
                        color: tab === 'saved' ? '#a6e3a1' : '#6c7086',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: 600
                    }}
                >
                    onSave {savedFlow ? '(1)' : '(0)'}
                </button>
            </div>

            {/* Summary stats + copy button */}
            {flow && (
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderBottom: '1px solid #313244' }}
                >
                    <span>
                        <span style={{ color: '#89b4fa' }}>nodes:</span> {flow.nodes.length}
                    </span>
                    <span>
                        <span style={{ color: '#f9e2af' }}>edges:</span> {flow.edges.length}
                    </span>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(flow, null, 2))
                            setCopied(true)
                            setTimeout(() => setCopied(false), 1500)
                        }}
                        style={{
                            marginLeft: 'auto',
                            padding: '3px 10px',
                            background: copied ? '#a6e3a1' : '#45475a',
                            color: copied ? '#1e1e2e' : '#cdd6f4',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            transition: 'all 0.15s'
                        }}
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            )}

            {/* JSON payload */}
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
                {flow ? (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                        {JSON.stringify(flow, null, 2)}
                    </pre>
                ) : (
                    <div style={{ color: '#6c7086', padding: '20px 0', textAlign: 'center' }}>
                        {tab === 'live'
                            ? 'Interact with the canvas to see live flow data.'
                            : 'Click Save or press Cmd+S to capture a snapshot.'}
                    </div>
                )}
            </div>
        </div>
    )
}
