/**
 * Basic Example
 *
 * Demonstrates minimal @flowiseai/agentflow usage:
 * - Rendering the canvas with an initial flow
 * - Tracking flow changes via onFlowChange
 * - Handling save via onSave
 * - Imperative fitView / clear via ref
 */

import { useCallback, useRef, useState } from 'react'

import type { AgentFlowInstance, FlowData } from '@flowiseai/agentflow'
import { Agentflow } from '@flowiseai/agentflow'

import { apiBaseUrl, token } from '../config'
import { FlowStatePanel } from '../FlowStatePanel'

const initialFlow: FlowData = {
    nodes: [
        {
            id: 'startAgentflow_0',
            type: 'agentflowNode',
            position: { x: 100, y: 100 },
            data: {
                id: 'startAgentflow_0',
                name: 'startAgentflow',
                label: 'Start',
                version: 1.3,
                color: '#7EE787',
                hideInput: true,
                inputs: { startInputType: 'chatInput' },
                outputAnchors: [{ id: 'startAgentflow_0-output-0', name: 'start', label: 'Start', type: 'start' }]
            }
        },
        {
            id: 'agentAgentflow_0',
            type: 'agentflowNode',
            position: { x: 250, y: 100 },
            data: {
                id: 'agentAgentflow_0',
                name: 'agentAgentflow',
                label: 'Agent',
                version: 1,
                color: '#4DD0E1',
                outputAnchors: [{ id: 'agentAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        }
    ],
    edges: [
        {
            id: 'edge-1',
            source: 'startAgentflow_0',
            sourceHandle: 'startAgentflow_0-output-0',
            target: 'agentAgentflow_0',
            targetHandle: 'agentAgentflow_0',
            type: 'agentflowEdge',
            data: { sourceColor: '#7EE787', targetColor: '#4DD0E1' }
        }
    ],
    viewport: { x: 0, y: 0, zoom: 1 }
}

export function BasicExample() {
    const agentflowRef = useRef<AgentFlowInstance>(null)
    const [currentFlow, setCurrentFlow] = useState<FlowData | null>(null)
    const [savedFlow, setSavedFlow] = useState<FlowData | null>(null)
    const [changeCount, setChangeCount] = useState(0)

    const handleFlowChange = useCallback((flow: FlowData) => {
        setCurrentFlow(flow)
        setChangeCount((c) => c + 1)
        console.log('onFlowChange:', flow)
    }, [])

    const handleSave = useCallback((flow: FlowData) => {
        setSavedFlow(flow)
        console.log('onSave:', flow)
    }, [])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Toolbar */}
            <div
                style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#fafafa'
                }}
            >
                <button onClick={() => agentflowRef.current?.fitView()}>Fit View</button>
                <button onClick={() => agentflowRef.current?.clear()}>Clear</button>
            </div>

            {/* Canvas + state panel */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ flex: 1 }}>
                    <Agentflow
                        ref={agentflowRef}
                        apiBaseUrl={apiBaseUrl}
                        token={token ?? undefined}
                        initialFlow={initialFlow}
                        onFlowChange={handleFlowChange}
                        onSave={handleSave}
                    />
                </div>
                <FlowStatePanel currentFlow={currentFlow} savedFlow={savedFlow} changeCount={changeCount} />
            </div>
        </div>
    )
}

export const BasicExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData',
    onFlowChange: '(flow: FlowData) => void',
    onSave: '(flow: FlowData) => void'
}
