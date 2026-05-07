/**
 * Status Indicators Example
 *
 * Demonstrates node execution status badges driven via the AgentFlowInstance ref:
 * - INPROGRESS: Spinning loader (amber)
 * - FINISHED: Green checkmark
 * - ERROR: Red exclamation (hover for error message)
 * - STOPPED/TERMINATED: Stop icons
 * - WAITING_FOR_INPUT: Stop icon
 */

import { useRef, useState } from 'react'

import type { AgentFlowInstance, ExecutionStatus, FlowData } from '@flowiseai/agentflow'
import { Agentflow } from '@flowiseai/agentflow'

import { apiBaseUrl, token } from '../config'

const initialFlow: FlowData = {
    nodes: [
        {
            id: 'startAgentflow_0',
            type: 'agentflowNode',
            position: { x: 100, y: 200 },
            data: {
                id: 'startAgentflow_0',
                name: 'startAgentflow',
                label: 'Start',
                version: 1.3,
                color: '#7EE787',
                hideInput: true,
                outputAnchors: [{ id: 'startAgentflow_0-output-0', name: 'start', label: 'Start', type: 'start' }]
            }
        },
        {
            id: 'llmAgentflow_0',
            type: 'agentflowNode',
            position: { x: 350, y: 100 },
            data: {
                id: 'llmAgentflow_0',
                name: 'llmAgentflow',
                label: 'LLM Node',
                version: 1.1,
                color: '#64B5F6',
                outputAnchors: [{ id: 'llmAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'llmAgentflow_1',
            type: 'agentflowNode',
            position: { x: 350, y: 300 },
            data: {
                id: 'llmAgentflow_1',
                name: 'llmAgentflow',
                label: 'Failing Task',
                version: 1.1,
                color: '#64B5F6',
                outputAnchors: [{ id: 'llmAgentflow_1-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'agentAgentflow_0',
            type: 'agentflowNode',
            position: { x: 600, y: 100 },
            data: {
                id: 'agentAgentflow_0',
                name: 'agentAgentflow',
                label: 'Agent Node',
                version: 3.2,
                color: '#4DD0E1',
                outputAnchors: [{ id: 'agentAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'humanInputAgentflow_0',
            type: 'agentflowNode',
            position: { x: 600, y: 300 },
            data: {
                id: 'humanInputAgentflow_0',
                name: 'humanInputAgentflow',
                label: 'Human Input',
                version: 1.0,
                color: '#6E6EFD',
                outputAnchors: [{ id: 'humanInputAgentflow_0-output-0', name: 'proceed', label: 'Proceed', type: 'string' }]
            }
        },
        {
            id: 'directReplyAgentflow_0',
            type: 'agentflowNode',
            position: { x: 850, y: 200 },
            data: {
                id: 'directReplyAgentflow_0',
                name: 'directReplyAgentflow',
                label: 'Direct Reply',
                version: 1.0,
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
            target: 'llmAgentflow_1',
            targetHandle: 'llmAgentflow_1',
            type: 'agentflowEdge',
            data: { sourceColor: '#7EE787', targetColor: '#64B5F6' }
        },
        {
            id: 'e3',
            source: 'llmAgentflow_0',
            sourceHandle: 'llmAgentflow_0-output-0',
            target: 'agentAgentflow_0',
            targetHandle: 'agentAgentflow_0',
            type: 'agentflowEdge',
            data: { sourceColor: '#64B5F6', targetColor: '#4DD0E1' }
        },
        {
            id: 'e4',
            source: 'llmAgentflow_1',
            sourceHandle: 'llmAgentflow_1-output-0',
            target: 'humanInputAgentflow_0',
            targetHandle: 'humanInputAgentflow_0',
            type: 'agentflowEdge',
            data: { sourceColor: '#64B5F6', targetColor: '#6E6EFD' }
        }
    ],
    viewport: { x: 0, y: 0, zoom: 0.9 }
}

export function StatusIndicatorsExample() {
    const agentflowRef = useRef<AgentFlowInstance>(null)
    const [isDarkMode, setIsDarkMode] = useState(false)

    const simulateExecution = () => {
        const ref = agentflowRef.current
        if (!ref) return

        // Clear any previous run first
        ref.clearExecutionState()

        const steps: Array<{ nodeId: string; status: ExecutionStatus; error?: string }> = [
            { nodeId: 'startAgentflow_0', status: 'INPROGRESS' },
            { nodeId: 'startAgentflow_0', status: 'FINISHED' },
            { nodeId: 'llmAgentflow_0', status: 'INPROGRESS' },
            { nodeId: 'llmAgentflow_1', status: 'INPROGRESS' },
            { nodeId: 'llmAgentflow_0', status: 'FINISHED' },
            {
                nodeId: 'llmAgentflow_1',
                status: 'ERROR',
                error: 'Client network socket disconnected before secure TLS connection was established.'
            },
            { nodeId: 'agentAgentflow_0', status: 'INPROGRESS' },
            { nodeId: 'humanInputAgentflow_0', status: 'WAITING_FOR_INPUT' },
            { nodeId: 'agentAgentflow_0', status: 'FINISHED' },
            { nodeId: 'humanInputAgentflow_0', status: 'FINISHED' },
            { nodeId: 'directReplyAgentflow_0', status: 'INPROGRESS' },
            { nodeId: 'directReplyAgentflow_0', status: 'FINISHED' }
        ]

        steps.forEach(({ nodeId, status, error }, index) => {
            setTimeout(() => {
                agentflowRef.current?.setNodeExecutionStatus(nodeId, status, error)
            }, (index + 1) * 800)
        })
    }

    const reset = () => {
        agentflowRef.current?.clearExecutionState()
    }

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
                    gap: '16px'
                }}
            >
                <span style={{ fontWeight: 600 }}>Status Indicators Demo</span>
                <button
                    onClick={simulateExecution}
                    style={{
                        padding: '8px 16px',
                        background: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Simulate Execution
                </button>
                <button
                    onClick={reset}
                    style={{
                        padding: '8px 16px',
                        background: '#9e9e9e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Reset
                </button>
                <button
                    onClick={() => setIsDarkMode((d) => !d)}
                    style={{
                        padding: '8px 16px',
                        background: isDarkMode ? '#444' : '#212121',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <span style={{ color: '#666', fontSize: '14px' }}>Hover over error nodes to see error messages</span>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1 }}>
                <Agentflow
                    ref={agentflowRef}
                    apiBaseUrl={apiBaseUrl}
                    token={token ?? undefined}
                    initialFlow={initialFlow}
                    showDefaultHeader={false}
                    readOnly={true}
                    isDarkMode={isDarkMode}
                />
            </div>
        </div>
    )
}

export const StatusIndicatorsExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData (status indicators)',
    showDefaultHeader: false,
    readOnly: true
}
