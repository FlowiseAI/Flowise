/**
 * Status Indicators Example
 *
 * Demonstrates node status indicators showing execution state:
 * - INPROGRESS: Spinning loader
 * - FINISHED: Green checkmark
 * - ERROR: Red exclamation
 * - STOPPED/TERMINATED: Stop icons
 */

import { useRef, useState } from 'react'

import type { AgentFlowInstance, FlowData, FlowNode } from '@flowise/agentflow'
import { Agentflow } from '@flowise/agentflow'

import { apiBaseUrl, token } from '../config'

const createFlowWithStatuses = (): FlowData => ({
    nodes: [
        {
            id: 'startAgentflow_0',
            type: 'agentflowNode',
            position: { x: 100, y: 200 },
            data: {
                id: 'startAgentflow_0',
                name: 'startAgentflow',
                label: 'Start',
                color: '#7EE787',
                hideInput: true,
                status: 'FINISHED',
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
                label: 'Processing...',
                color: '#64B5F6',
                status: 'INPROGRESS',
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
                label: 'Failed Task',
                color: '#64B5F6',
                status: 'ERROR',
                error: 'API rate limit exceeded. Please try again later.',
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
                label: 'Completed',
                color: '#4DD0E1',
                status: 'FINISHED',
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
                label: 'Stopped',
                color: '#6E6EFD',
                status: 'STOPPED',
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
                label: 'Pending',
                color: '#4DDBBB',
                // No status = pending/not yet executed
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
})

export function StatusIndicatorsExample() {
    // Config loaded from environment variables
    const agentflowRef = useRef<AgentFlowInstance>(null)
    const [flow, setFlow] = useState<FlowData>(createFlowWithStatuses)

    const simulateExecution = () => {
        // Reset all statuses
        const newNodes: FlowNode[] = flow.nodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                status: undefined,
                error: undefined
            }
        }))
        setFlow({ ...flow, nodes: newNodes })

        // Simulate step-by-step execution
        const statuses: Array<{ nodeId: string; status: 'INPROGRESS' | 'FINISHED' | 'ERROR' }> = [
            { nodeId: 'startAgentflow_0', status: 'INPROGRESS' },
            { nodeId: 'startAgentflow_0', status: 'FINISHED' },
            { nodeId: 'llmAgentflow_0', status: 'INPROGRESS' },
            { nodeId: 'llmAgentflow_1', status: 'INPROGRESS' },
            { nodeId: 'llmAgentflow_0', status: 'FINISHED' },
            { nodeId: 'llmAgentflow_1', status: 'ERROR' },
            { nodeId: 'agentAgentflow_0', status: 'INPROGRESS' },
            { nodeId: 'agentAgentflow_0', status: 'FINISHED' }
        ]

        statuses.forEach(({ nodeId, status }, index) => {
            setTimeout(() => {
                setFlow((prev) => ({
                    ...prev,
                    nodes: prev.nodes.map((node) =>
                        node.id === nodeId
                            ? {
                                  ...node,
                                  data: {
                                      ...node.data,
                                      status,
                                      error: status === 'ERROR' ? 'Simulated error for demo' : undefined
                                  }
                              }
                            : node
                    )
                }))
            }, (index + 1) * 800)
        })
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
                    onClick={() => setFlow(createFlowWithStatuses())}
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
                <span style={{ color: '#666', fontSize: '14px' }}>Hover over error nodes to see error messages</span>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1 }}>
                <Agentflow
                    ref={agentflowRef}
                    apiBaseUrl={apiBaseUrl}
                    token={token ?? undefined}
                    initialFlow={flow}
                    showDefaultHeader={false}
                    readOnly={true}
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
