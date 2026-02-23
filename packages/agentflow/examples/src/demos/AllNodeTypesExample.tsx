/**
 * All Node Types Example
 *
 * Showcases all available node types with their distinct colors and icons.
 * Useful for understanding the visual vocabulary of Agentflow.
 */

import { useRef } from 'react'

import type { AgentFlowInstance, FlowData } from '@flowise/agentflow'
import { Agentflow } from '@flowise/agentflow'

import { apiBaseUrl, token } from '../config'

// Showcase all node types in a grid layout
const allNodesFlow: FlowData = {
    nodes: [
        // Row 1: Core Flow Nodes
        {
            id: 'startAgentflow_0',
            type: 'agentflowNode',
            position: { x: 50, y: 50 },
            data: {
                id: 'startAgentflow_0',
                name: 'startAgentflow',
                label: 'Start',
                color: '#7EE787',
                hideInput: true,
                outputAnchors: [{ id: 'startAgentflow_0-output-0', name: 'start', label: 'Start', type: 'start' }]
            }
        },
        {
            id: 'llmAgentflow_0',
            type: 'agentflowNode',
            position: { x: 250, y: 50 },
            data: {
                id: 'llmAgentflow_0',
                name: 'llmAgentflow',
                label: 'LLM',
                color: '#64B5F6',
                outputAnchors: [{ id: 'llmAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'agentAgentflow_0',
            type: 'agentflowNode',
            position: { x: 450, y: 50 },
            data: {
                id: 'agentAgentflow_0',
                name: 'agentAgentflow',
                label: 'Agent',
                color: '#4DD0E1',
                outputAnchors: [{ id: 'agentAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'directReplyAgentflow_0',
            type: 'agentflowNode',
            position: { x: 650, y: 50 },
            data: {
                id: 'directReplyAgentflow_0',
                name: 'directReplyAgentflow',
                label: 'Direct Reply',
                color: '#4DDBBB',
                outputAnchors: [{ id: 'directReplyAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },

        // Row 2: Control Flow Nodes
        {
            id: 'conditionAgentflow_0',
            type: 'agentflowNode',
            position: { x: 50, y: 180 },
            data: {
                id: 'conditionAgentflow_0',
                name: 'conditionAgentflow',
                label: 'Condition',
                color: '#FFB938',
                outputAnchors: [
                    { id: 'conditionAgentflow_0-output-0', name: 'true', label: 'True', type: 'boolean' },
                    { id: 'conditionAgentflow_0-output-1', name: 'false', label: 'False', type: 'boolean' }
                ]
            }
        },
        {
            id: 'conditionAgentAgentflow_0',
            type: 'agentflowNode',
            position: { x: 250, y: 180 },
            data: {
                id: 'conditionAgentAgentflow_0',
                name: 'conditionAgentAgentflow',
                label: 'Condition Agent',
                color: '#ff8fab',
                outputAnchors: [{ id: 'conditionAgentAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'loopAgentflow_0',
            type: 'agentflowNode',
            position: { x: 450, y: 180 },
            data: {
                id: 'loopAgentflow_0',
                name: 'loopAgentflow',
                label: 'Loop',
                color: '#FFA07A',
                outputAnchors: [{ id: 'loopAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'iterationAgentflow_0',
            type: 'agentflowNode',
            position: { x: 650, y: 180 },
            data: {
                id: 'iterationAgentflow_0',
                name: 'iterationAgentflow',
                label: 'Iteration',
                color: '#9C89B8',
                outputAnchors: [{ id: 'iterationAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },

        // Row 3: Interactive & Tool Nodes
        {
            id: 'humanInputAgentflow_0',
            type: 'agentflowNode',
            position: { x: 50, y: 310 },
            data: {
                id: 'humanInputAgentflow_0',
                name: 'humanInputAgentflow',
                label: 'Human Input',
                color: '#6E6EFD',
                outputAnchors: [
                    { id: 'humanInputAgentflow_0-output-0', name: 'proceed', label: 'Proceed', type: 'string' },
                    { id: 'humanInputAgentflow_0-output-1', name: 'reject', label: 'Reject', type: 'string' }
                ]
            }
        },
        {
            id: 'toolAgentflow_0',
            type: 'agentflowNode',
            position: { x: 250, y: 310 },
            data: {
                id: 'toolAgentflow_0',
                name: 'toolAgentflow',
                label: 'Tool',
                color: '#d4a373',
                outputAnchors: [{ id: 'toolAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'retrieverAgentflow_0',
            type: 'agentflowNode',
            position: { x: 450, y: 310 },
            data: {
                id: 'retrieverAgentflow_0',
                name: 'retrieverAgentflow',
                label: 'Retriever',
                color: '#b8bedd',
                outputAnchors: [{ id: 'retrieverAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'customFunctionAgentflow_0',
            type: 'agentflowNode',
            position: { x: 650, y: 310 },
            data: {
                id: 'customFunctionAgentflow_0',
                name: 'customFunctionAgentflow',
                label: 'Custom Function',
                color: '#E4B7FF',
                outputAnchors: [{ id: 'customFunctionAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },

        // Row 4: Integration Nodes
        {
            id: 'httpAgentflow_0',
            type: 'agentflowNode',
            position: { x: 50, y: 440 },
            data: {
                id: 'httpAgentflow_0',
                name: 'httpAgentflow',
                label: 'HTTP Request',
                color: '#FF7F7F',
                outputAnchors: [{ id: 'httpAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'executeFlowAgentflow_0',
            type: 'agentflowNode',
            position: { x: 250, y: 440 },
            data: {
                id: 'executeFlowAgentflow_0',
                name: 'executeFlowAgentflow',
                label: 'Execute Flow',
                color: '#a3b18a',
                outputAnchors: [{ id: 'executeFlowAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'stickyNoteAgentflow_0',
            type: 'agentflowNode',
            position: { x: 450, y: 440 },
            data: {
                id: 'stickyNoteAgentflow_0',
                name: 'stickyNoteAgentflow',
                label: 'Sticky Note',
                color: '#fee440',
                outputAnchors: []
            }
        }
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 0.85 }
}

export function AllNodeTypesExample() {
    // Config loaded from environment variables
    const agentflowRef = useRef<AgentFlowInstance>(null)

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Info Header */}
            <div
                style={{
                    padding: '16px 20px',
                    background: '#fff',
                    borderBottom: '1px solid #e0e0e0'
                }}
            >
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>All Node Types</h2>
                <p style={{ margin: '8px 0 0', color: '#666', fontSize: '14px' }}>
                    Showcasing all available node types with their colors and icons. Hover over nodes to see the output handles.
                </p>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1 }}>
                <Agentflow
                    ref={agentflowRef}
                    apiBaseUrl={apiBaseUrl}
                    token={token ?? undefined}
                    initialFlow={allNodesFlow}
                    showDefaultHeader={false}
                    readOnly={true}
                />
            </div>
        </div>
    )
}

export const AllNodeTypesExampleProps = {
    apiBaseUrl: apiBaseUrl,
    token: token,
    initialFlow: 'FlowData (15 node types)',
    readOnly: true,
    showDefaultHeader: false,
    enableGenerator: false
}
