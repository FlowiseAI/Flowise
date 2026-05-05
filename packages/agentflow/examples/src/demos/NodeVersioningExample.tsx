/**
 * Node Versioning Example
 *
 * Demonstrates outdated node detection and upgrade via syncNodes:
 * - Nodes with data.version < server componentNode.version show a warning badge
 * - The built-in "Sync Nodes" button appears in the header when outdated nodes exist
 * - "Reset to Outdated" remounts the canvas with the original version-1 flow
 */

import { useState } from 'react'

import type { FlowData } from '@flowiseai/agentflow'
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
                version: 1.1,
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
            id: 'directReplyAgentflow_0',
            type: 'agentflowNode',
            position: { x: 680, y: 200 },
            data: {
                id: 'directReplyAgentflow_0',
                name: 'directReplyAgentflow',
                label: 'Direct Reply (no version)',
                color: '#4DDBBB',
                outputAnchors: [{ id: 'directReplyAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
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
            target: 'directReplyAgentflow_0',
            targetHandle: 'directReplyAgentflow_0',
            type: 'agentflowEdge',
            data: { sourceColor: '#64B5F6', targetColor: '#4DD0E1' }
        }
    ],
    viewport: { x: 0, y: 0, zoom: 1 }
}

export function NodeVersioningExample() {
    const [resetKey, setResetKey] = useState(0)

    const resetToOutdated = () => setResetKey((k) => k + 1)

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
                <span style={{ color: '#666', fontSize: '13px' }}>
                    1 node current, 1 node outdated, 1 node with no version. Use &quot;Sync Nodes&quot; in the header to upgrade.
                </span>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1 }}>
                <Agentflow
                    key={resetKey}
                    apiBaseUrl={apiBaseUrl}
                    token={token ?? undefined}
                    initialFlow={outdatedFlow}
                    showDefaultHeader={true}
                />
            </div>
        </div>
    )
}

export const NodeVersioningExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData (all nodes at version 1)',
    showDefaultHeader: true
}
