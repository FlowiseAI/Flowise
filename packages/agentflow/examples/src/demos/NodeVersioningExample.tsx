/**
 * Node Versioning Example
 *
 * Demonstrates outdated node detection and upgrade via syncNodes:
 * - Nodes with data.version < server componentNode.version show a warning badge + Sync Nodes FAB
 * - Nodes with no version show a warning badge only (can't auto-upgrade without a baseline version)
 * - "Reset" remounts the canvas with the selected scenario's original flow
 */

import { useState } from 'react'

import type { FlowData } from '@flowiseai/agentflow'
import { Agentflow } from '@flowiseai/agentflow'

import { apiBaseUrl, token } from '../config'

// ─── Scenario definitions ─────────────────────────────────────────────────────

const scenario1Flow: FlowData = {
    nodes: [
        {
            id: 'startAgentflow_0',
            type: 'agentflowNode',
            position: { x: 80, y: 200 },
            data: {
                id: 'startAgentflow_0',
                name: 'startAgentflow',
                label: 'Start (current)',
                version: 1.3,
                color: '#7EE787',
                hideInput: true,
                inputs: { startInputType: 'chatInput' },
                outputAnchors: [{ id: 'startAgentflow_0-output-0', name: 'start', label: 'Start', type: 'start' }]
            }
        },
        {
            id: 'llmAgentflow_0',
            type: 'agentflowNode',
            position: { x: 360, y: 200 },
            data: {
                id: 'llmAgentflow_0',
                name: 'llmAgentflow',
                label: 'LLM (outdated v1)',
                version: 1,
                color: '#64B5F6',
                inputs: { llmModel: 'gpt-3.5-turbo' },
                outputAnchors: [{ id: 'llmAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'directReplyAgentflow_0',
            type: 'agentflowNode',
            position: { x: 640, y: 200 },
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
            data: { sourceColor: '#64B5F6', targetColor: '#4DDBBB' }
        }
    ],
    viewport: { x: 0, y: 0, zoom: 1 }
}

const scenario2Flow: FlowData = {
    nodes: [
        {
            id: 'startAgentflow_0',
            type: 'agentflowNode',
            position: { x: 80, y: 200 },
            data: {
                id: 'startAgentflow_0',
                name: 'startAgentflow',
                label: 'Start (current)',
                version: 1.3,
                color: '#7EE787',
                hideInput: true,
                inputs: { startInputType: 'chatInput' },
                outputAnchors: [{ id: 'startAgentflow_0-output-0', name: 'start', label: 'Start', type: 'start' }]
            }
        },
        {
            id: 'llmAgentflow_0',
            type: 'agentflowNode',
            position: { x: 360, y: 130 },
            data: {
                id: 'llmAgentflow_0',
                name: 'llmAgentflow',
                label: 'LLM (no version)',
                color: '#64B5F6',
                inputs: { llmModel: 'gpt-3.5-turbo' },
                outputAnchors: [{ id: 'llmAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'directReplyAgentflow_0',
            type: 'agentflowNode',
            position: { x: 360, y: 280 },
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
            source: 'startAgentflow_0',
            sourceHandle: 'startAgentflow_0-output-0',
            target: 'directReplyAgentflow_0',
            targetHandle: 'directReplyAgentflow_0',
            type: 'agentflowEdge',
            data: { sourceColor: '#7EE787', targetColor: '#4DDBBB' }
        }
    ],
    viewport: { x: 0, y: 0, zoom: 1 }
}

const scenarios = [
    {
        label: 'Scenario A — 1 current, 1 outdated, 1 no version',
        flow: scenario1Flow,
        description: (
            <>
                <strong>Start</strong> is at the current server version — no badge. <strong>LLM</strong> is at version 1, behind the server
                — warning badge shown and the orange <strong>Sync Nodes</strong> FAB appears top-left on the canvas. Clicking it upgrades
                all outdated nodes. <strong>Direct Reply</strong> has no version field — warning badge shown, but{' '}
                <strong>no Sync Nodes FAB</strong> (a baseline version is required to auto-upgrade).
            </>
        )
    },
    {
        label: 'Scenario B — 1 current, 2 no version',
        flow: scenario2Flow,
        description: (
            <>
                <strong>Start</strong> is at the current server version — no badge. <strong>LLM</strong> and <strong>Direct Reply</strong>{' '}
                both have no version field — each shows a warning badge. <strong>No Sync Nodes FAB</strong> appears because none of the
                nodes have a version to compare against; they must be manually inspected and updated.
            </>
        )
    }
]

// ─── Component ────────────────────────────────────────────────────────────────

export function NodeVersioningExample() {
    const [scenarioIndex, setScenarioIndex] = useState(0)
    const [resetKey, setResetKey] = useState(0)

    const selected = scenarios[scenarioIndex]

    const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setScenarioIndex(Number(e.target.value))
        setResetKey((k) => k + 1)
    }

    const handleReset = () => setResetKey((k) => k + 1)

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Controls */}
            <div
                style={{
                    padding: '12px 16px',
                    background: '#fff',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    flexShrink: 0,
                    flexWrap: 'wrap'
                }}
            >
                <span style={{ fontWeight: 600, alignSelf: 'center' }}>Node Versioning Demo</span>

                <select
                    value={scenarioIndex}
                    onChange={handleScenarioChange}
                    style={{
                        padding: '7px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        alignSelf: 'center'
                    }}
                >
                    {scenarios.map((s, i) => (
                        <option key={i} value={i}>
                            {s.label}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleReset}
                    style={{
                        padding: '7px 14px',
                        background: '#ff7043',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        alignSelf: 'center'
                    }}
                >
                    Reset
                </button>

                <span style={{ color: '#555', fontSize: '13px', lineHeight: '1.5', flex: 1, minWidth: 260 }}>{selected.description}</span>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1 }}>
                <Agentflow
                    key={resetKey}
                    apiBaseUrl={apiBaseUrl}
                    token={token ?? undefined}
                    initialFlow={selected.flow}
                    showDefaultHeader={true}
                />
            </div>
        </div>
    )
}

export const NodeVersioningExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData (scenario-specific)',
    showDefaultHeader: true
}
