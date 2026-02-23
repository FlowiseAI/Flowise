/**
 * Multi-Node Flow Example
 *
 * Demonstrates a complete flow with multiple connected nodes,
 * showing the styled edges with gradient colors.
 */

import { useRef } from 'react'

import type { AgentFlowInstance, FlowData } from '@flowise/agentflow'
import { Agentflow } from '@flowise/agentflow'

import { apiBaseUrl, token } from '../config'

// A complete translation agent flow
const translationFlow: FlowData = {
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
                outputAnchors: [{ id: 'startAgentflow_0-output-0', name: 'start', label: 'Start', type: 'start' }]
            }
        },
        {
            id: 'llmAgentflow_0',
            type: 'agentflowNode',
            position: { x: 400, y: 100 },
            data: {
                id: 'llmAgentflow_0',
                name: 'llmAgentflow',
                label: 'Translator',
                color: '#64B5F6',
                outputAnchors: [{ id: 'llmAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }],
                inputValues: {
                    llmModel: 'chatGoogleGenerativeAI',
                    llmModelConfig: {
                        modelName: 'gemini-2.0-flash'
                    }
                }
            }
        },
        {
            id: 'conditionAgentflow_0',
            type: 'agentflowNode',
            position: { x: 700, y: 100 },
            data: {
                id: 'conditionAgentflow_0',
                name: 'conditionAgentflow',
                label: 'Check Quality',
                color: '#FFB938',
                outputAnchors: [
                    { id: 'conditionAgentflow_0-output-0', name: 'true', label: 'Pass', type: 'boolean' },
                    { id: 'conditionAgentflow_0-output-1', name: 'false', label: 'Fail', type: 'boolean' }
                ]
            }
        },
        {
            id: 'directReplyAgentflow_0',
            type: 'agentflowNode',
            position: { x: 1000, y: 50 },
            data: {
                id: 'directReplyAgentflow_0',
                name: 'directReplyAgentflow',
                label: 'Send Response',
                color: '#4DDBBB',
                outputAnchors: [{ id: 'directReplyAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        },
        {
            id: 'humanInputAgentflow_0',
            type: 'agentflowNode',
            position: { x: 1000, y: 200 },
            data: {
                id: 'humanInputAgentflow_0',
                name: 'humanInputAgentflow',
                label: 'Review Required',
                color: '#6E6EFD',
                outputAnchors: [
                    { id: 'humanInputAgentflow_0-output-0', name: 'proceed', label: 'Proceed', type: 'string' },
                    { id: 'humanInputAgentflow_0-output-1', name: 'reject', label: 'Reject', type: 'string' }
                ]
            }
        }
    ],
    edges: [
        {
            id: 'edge-start-translator',
            source: 'startAgentflow_0',
            sourceHandle: 'startAgentflow_0-output-0',
            target: 'llmAgentflow_0',
            targetHandle: 'llmAgentflow_0',
            type: 'agentflowEdge',
            data: {
                sourceColor: '#7EE787',
                targetColor: '#64B5F6'
            }
        },
        {
            id: 'edge-translator-condition',
            source: 'llmAgentflow_0',
            sourceHandle: 'llmAgentflow_0-output-0',
            target: 'conditionAgentflow_0',
            targetHandle: 'conditionAgentflow_0',
            type: 'agentflowEdge',
            data: {
                sourceColor: '#64B5F6',
                targetColor: '#FFB938'
            }
        },
        {
            id: 'edge-condition-reply',
            source: 'conditionAgentflow_0',
            sourceHandle: 'conditionAgentflow_0-output-0',
            target: 'directReplyAgentflow_0',
            targetHandle: 'directReplyAgentflow_0',
            type: 'agentflowEdge',
            data: {
                sourceColor: '#FFB938',
                targetColor: '#4DDBBB',
                edgeLabel: '0'
            }
        },
        {
            id: 'edge-condition-human',
            source: 'conditionAgentflow_0',
            sourceHandle: 'conditionAgentflow_0-output-1',
            target: 'humanInputAgentflow_0',
            targetHandle: 'humanInputAgentflow_0',
            type: 'agentflowEdge',
            data: {
                sourceColor: '#FFB938',
                targetColor: '#6E6EFD',
                edgeLabel: '1'
            }
        }
    ],
    viewport: { x: 0, y: 0, zoom: 0.8 }
}

export function MultiNodeFlow() {
    // Config loaded from environment variables
    const agentflowRef = useRef<AgentFlowInstance>(null)

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
                <Agentflow
                    ref={agentflowRef}
                    apiBaseUrl={apiBaseUrl}
                    token={token ?? undefined}
                    initialFlow={translationFlow}
                    showDefaultHeader={true}
                    onFlowChange={(flow) => console.log('Flow changed:', flow.nodes.length, 'nodes')}
                />
            </div>
        </div>
    )
}

export const MultiNodeFlowProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData (multiple nodes)',
    showDefaultHeader: true,
    onFlowChange: '(flow: FlowData) => void'
}
