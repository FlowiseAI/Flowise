/**
 * Basic Example
 *
 * Demonstrates basic @flowise/agentflow usage with imperative methods.
 */

import { useRef, useState } from 'react'

import type { AgentFlowInstance, FlowData, ValidationResult } from '@flowise/agentflow'
import { Agentflow } from '@flowise/agentflow'

import { apiBaseUrl, token } from '../config'

// Example flow data
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
                color: '#7EE787',
                hideInput: true,
                outputAnchors: [{ id: 'startAgentflow_0-output-0', name: 'start', label: 'Start', type: 'start' }]
            }
        }
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
}

export function BasicExample() {
    // Config loaded from environment variables
    const agentflowRef = useRef<AgentFlowInstance>(null)
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

    const handleFlowChange = (flow: FlowData) => {
        console.log('Flow changed:', flow)
    }

    const handleSave = (flow: FlowData) => {
        console.log('Flow saved:', flow)
        alert('Flow saved! Check console for data.')
    }

    const handleValidate = () => {
        if (agentflowRef.current) {
            const result = agentflowRef.current.validate()
            setValidationResult(result)
            console.log('Validation result:', result)
        }
    }

    const handleFitView = () => {
        if (agentflowRef.current) {
            agentflowRef.current.fitView()
        }
    }

    const handleGetFlow = () => {
        if (agentflowRef.current) {
            const flow = agentflowRef.current.getFlow()
            console.log('Current flow:', flow)
            alert('Flow data logged to console!')
        }
    }

    const handleClear = () => {
        if (agentflowRef.current) {
            agentflowRef.current.clear()
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Toolbar */}
            <div
                style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#fafafa'
                }}
            >
                <button onClick={handleValidate}>Validate</button>
                <button onClick={handleFitView}>Fit View</button>
                <button onClick={handleGetFlow}>Get Flow</button>
                <button onClick={handleClear}>Clear</button>
                {validationResult && (
                    <span style={{ marginLeft: '20px', color: validationResult.valid ? 'green' : 'red' }}>
                        {validationResult.valid ? '✓ Valid' : `✗ ${validationResult.errors.length} error(s)`}
                    </span>
                )}
            </div>

            {/* Canvas */}
            <div style={{ flex: 1 }}>
                <Agentflow
                    ref={agentflowRef}
                    apiBaseUrl={apiBaseUrl}
                    token={token ?? undefined}
                    initialFlow={initialFlow}
                    onFlowChange={handleFlowChange}
                    onSave={handleSave}
                    showDefaultHeader={true}
                />
            </div>
        </div>
    )
}

export const BasicExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData',
    onFlowChange: '(flow: FlowData) => void',
    onSave: '(flow: FlowData) => void',
    showDefaultHeader: true
}
