/**
 * Custom UI Example
 *
 * Demonstrates how to customize the header and node palette
 * using render props for full control over the UI.
 */

import { useRef, useState } from 'react'

import type { AgentFlowInstance, FlowData, HeaderRenderProps, PaletteRenderProps } from '@flowise/agentflow'
import { Agentflow } from '@flowise/agentflow'

import { apiBaseUrl, token } from '../config'

const initialFlow: FlowData = {
    nodes: [
        {
            id: 'startAgentflow_0',
            type: 'agentflowNode',
            position: { x: 300, y: 200 },
            data: {
                id: 'startAgentflow_0',
                name: 'startAgentflow',
                label: 'Start',
                color: '#7EE787',
                hideInput: true,
                outputAnchors: [{ id: 'startAgentflow_0-output-0', name: 'start', label: 'Start', type: 'start' }]
            }
        }
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
}

// Custom header component
function CustomHeader({ flowName, isDirty, onSave, onExport, onValidate }: HeaderRenderProps) {
    const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | null>(null)

    const handleValidate = () => {
        const result = onValidate()
        setValidationStatus(result.valid ? 'valid' : 'invalid')
        setTimeout(() => setValidationStatus(null), 3000)
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>🤖</span>
                <span style={{ fontWeight: 600, fontSize: '16px' }}>{flowName}</span>
                {isDirty && (
                    <span
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px'
                        }}
                    >
                        Unsaved
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={handleValidate}
                    style={{
                        padding: '8px 16px',
                        background:
                            validationStatus === 'valid' ? '#4CAF50' : validationStatus === 'invalid' ? '#f44336' : 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {validationStatus === 'valid' ? '✓ Valid' : validationStatus === 'invalid' ? '✗ Invalid' : 'Validate'}
                </button>
                <button
                    onClick={onExport}
                    style={{
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Export JSON
                </button>
                <button
                    onClick={onSave}
                    style={{
                        padding: '8px 16px',
                        background: '#fff',
                        color: '#764ba2',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    Save Flow
                </button>
            </div>
        </div>
    )
}

// Custom palette component
function CustomPalette({ availableNodes, onAddNode }: PaletteRenderProps) {
    const [search, setSearch] = useState('')
    const [hoveredNode, setHoveredNode] = useState<string | null>(null)

    const filteredNodes = availableNodes.filter(
        (node) => node.label.toLowerCase().includes(search.toLowerCase()) || node.name.toLowerCase().includes(search.toLowerCase())
    )

    // Group nodes by category
    const categories = filteredNodes.reduce((acc, node) => {
        const category = node.category || 'Other'
        if (!acc[category]) acc[category] = []
        acc[category].push(node)
        return acc
    }, {} as Record<string, typeof availableNodes>)

    return (
        <div
            style={{
                width: '280px',
                background: '#f8f9fa',
                borderRight: '1px solid #e0e0e0',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}
        >
            {/* Search */}
            <div style={{ padding: '16px' }}>
                <input
                    type='text'
                    placeholder='Search nodes...'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none'
                    }}
                />
            </div>

            {/* Node List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
                {Object.entries(categories).map(([category, nodes]) => (
                    <div key={category} style={{ marginBottom: '16px' }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                color: '#9e9e9e',
                                marginBottom: '8px',
                                letterSpacing: '0.5px'
                            }}
                        >
                            {category}
                        </div>
                        {nodes.map((node) => (
                            <div
                                key={node.name}
                                role='button'
                                tabIndex={0}
                                onClick={() => onAddNode(node.name)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        onAddNode(node.name)
                                    }
                                }}
                                onMouseEnter={() => setHoveredNode(node.name)}
                                onMouseLeave={() => setHoveredNode(null)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 12px',
                                    marginBottom: '4px',
                                    background: hoveredNode === node.name ? '#fff' : 'transparent',
                                    border: `1px solid ${hoveredNode === node.name ? '#e0e0e0' : 'transparent'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: node.color || '#9e9e9e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: '14px'
                                    }}
                                >
                                    {node.label.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: '14px', color: '#333' }}>{node.label}</div>
                                    {node.description && (
                                        <div
                                            style={{
                                                fontSize: '12px',
                                                color: '#9e9e9e',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: '180px'
                                            }}
                                        >
                                            {node.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

export function CustomUIExample() {
    // Config loaded from environment variables
    const agentflowRef = useRef<AgentFlowInstance>(null)

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
                <Agentflow
                    ref={agentflowRef}
                    apiBaseUrl={apiBaseUrl}
                    token={token ?? undefined}
                    initialFlow={initialFlow}
                    renderHeader={(props) => <CustomHeader {...props} />}
                    renderNodePalette={(props) => <CustomPalette {...props} />}
                    showDefaultHeader={false}
                    showDefaultPalette={false}
                    onSave={(flow) => {
                        console.log('Saving flow:', flow)
                        alert('Flow saved! Check console.')
                    }}
                />
            </div>
        </div>
    )
}

export const CustomUIExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData',
    renderHeader: '(props: HeaderRenderProps) => ReactNode',
    renderNodePalette: '(props: PaletteRenderProps) => ReactNode',
    showDefaultHeader: false,
    showDefaultPalette: false,
    onSave: '(flow: FlowData) => void'
}
