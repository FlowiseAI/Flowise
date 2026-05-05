/**
 * Node Versioning Example
 *
 * Demonstrates outdated node detection and upgrade via syncNodes:
 * - Nodes with data.version < server componentNode.version show a warning badge
 * - The built-in "Sync Nodes" button appears in the header when outdated nodes exist
 * - syncNodes() can also be called programmatically via the AgentFlowInstance ref
 * - "Reset to Outdated" remounts the canvas with the original version-1 flow
 */

import { useCallback, useRef, useState } from 'react'

import type { AgentFlowInstance, FlowData } from '@flowiseai/agentflow'
import { Agentflow } from '@flowiseai/agentflow'

import { apiBaseUrl, token } from '../config'

const outdatedFlow: FlowData = {
    nodes: [
        {
            id: 'startAgentflow_0',
            type: 'agentflowNode',
            position: { x: 100, y: 200 },
            data: {
                id: 'startAgentflow_0',
                name: 'startAgentflow',
                label: 'Start',
                version: 1,
                color: '#7EE787',
                hideInput: true,
                inputs: { startInputType: 'chatInput' },
                outputAnchors: [{ id: 'startAgentflow_0-output-0', name: 'start', label: 'Start', type: 'start' }]
            }
        },
        {
            id: 'llmAgentflow_0',
            type: 'agentflowNode',
            position: { x: 380, y: 200 },
            data: {
                id: 'llmAgentflow_0',
                name: 'llmAgentflow',
                label: 'LLM (outdated)',
                version: 1,
                color: '#64B5F6',
                inputs: { llmModel: 'gpt-3.5-turbo' },
                outputAnchors: [{ id: 'llmAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'agentAgentflow_0',
            type: 'agentflowNode',
            position: { x: 660, y: 200 },
            data: {
                id: 'agentAgentflow_0',
                name: 'agentAgentflow',
                label: 'Agent (outdated)',
                version: 1,
                color: '#4DD0E1',
                outputAnchors: [{ id: 'agentAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        }
    ],
    edges: [
        {
            id: 'e1',
            source: 'startAgentflow_0',
            sourceHandle: 'startAgentflow_0-output-0',
            target: 'llmAgentflow_0',
            targetHandle: 'llmAgentflow_0',
            type: 'agentflowEdge',
            data: { sourceColor: '#7EE787', targetColor: '#64B5F6' }
        },
        {
            id: 'e2',
            source: 'llmAgentflow_0',
            sourceHandle: 'llmAgentflow_0-output-0',
            target: 'agentAgentflow_0',
            targetHandle: 'agentAgentflow_0',
            type: 'agentflowEdge',
            data: { sourceColor: '#64B5F6', targetColor: '#4DD0E1' }
        }
    ],
    viewport: { x: 0, y: 0, zoom: 1 }
}

type NodeVersionInfo = {
    id: string
    name: string
    label: string
    version?: number
}

export function NodeVersioningExample() {
    const agentflowRef = useRef<AgentFlowInstance>(null)
    const [resetKey, setResetKey] = useState(0)
    const [nodeVersions, setNodeVersions] = useState<NodeVersionInfo[]>([])
    const [changeCount, setChangeCount] = useState(0)

    const handleFlowChange = useCallback((flow: FlowData) => {
        setChangeCount((c) => c + 1)
        setNodeVersions(
            flow.nodes.map((n) => ({
                id: n.data.id,
                name: n.data.name,
                label: n.data.label,
                version: n.data.version
            }))
        )
    }, [])

    const resetToOutdated = () => setResetKey((k) => k + 1)
    const syncViaRef = () => agentflowRef.current?.syncNodes()

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Controls */}
            <div
                style={{
                    padding: '12px 16px',
                    background: '#fff',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexShrink: 0
                }}
            >
                <span style={{ fontWeight: 600 }}>Node Versioning Demo</span>
                <button
                    onClick={resetToOutdated}
                    style={{
                        padding: '8px 16px',
                        background: '#ff7043',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Reset to Outdated
                </button>
                <button
                    onClick={syncViaRef}
                    style={{
                        padding: '8px 16px',
                        background: '#2196F3',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Sync Now (via ref)
                </button>
                <span style={{ color: '#666', fontSize: '13px' }}>
                    All 3 nodes start at version 1. Use &quot;Sync Nodes&quot; in the header or &quot;Sync Now&quot; to upgrade.
                </span>
            </div>

            {/* Canvas + version panel */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ flex: 1 }}>
                    <Agentflow
                        key={resetKey}
                        ref={agentflowRef}
                        apiBaseUrl={apiBaseUrl}
                        token={token ?? undefined}
                        initialFlow={outdatedFlow}
                        onFlowChange={handleFlowChange}
                        showDefaultHeader={true}
                    />
                </div>

                {/* Version info side panel */}
                <div
                    style={{
                        width: '260px',
                        background: '#1e1e2e',
                        color: '#cdd6f4',
                        display: 'flex',
                        flexDirection: 'column',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        borderLeft: '1px solid #313244'
                    }}
                >
                    <div
                        style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #313244',
                            color: '#cba6f7',
                            fontWeight: 600
                        }}
                    >
                        Node Versions (change #{changeCount})
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
                        {nodeVersions.length === 0 ? (
                            <div style={{ color: '#6c7086', paddingTop: '12px' }}>Interact with the canvas to see live version data.</div>
                        ) : (
                            nodeVersions.map((n) => (
                                <div
                                    key={n.id}
                                    style={{ marginBottom: '12px', padding: '8px', background: '#313244', borderRadius: '6px' }}
                                >
                                    <div style={{ color: '#89b4fa', fontWeight: 600, marginBottom: '4px' }}>{n.label}</div>
                                    <div style={{ color: '#6c7086', fontSize: '11px', marginBottom: '4px' }}>name: {n.name}</div>
                                    <div>
                                        version:{' '}
                                        <span style={{ color: n.version !== undefined ? '#a6e3a1' : '#f38ba8' }}>
                                            {n.version ?? 'undefined (outdated)'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                        <div
                            style={{
                                marginTop: '16px',
                                padding: '8px',
                                background: '#181825',
                                borderRadius: '6px',
                                fontSize: '11px',
                                color: '#6c7086',
                                lineHeight: 1.6
                            }}
                        >
                            <div style={{ color: '#f9e2af', marginBottom: '4px', fontWeight: 600 }}>How it works</div>
                            <div>• Nodes start at version 1</div>
                            <div>• Server reports higher versions</div>
                            <div>• Warning badge appears on node</div>
                            <div>• &quot;Sync Nodes&quot; in header upgrades all</div>
                            <div>• After sync, version matches server</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const NodeVersioningExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData (all nodes at version 1)',
    showDefaultHeader: true,
    onFlowChange: '(flow: FlowData) => void'
}
