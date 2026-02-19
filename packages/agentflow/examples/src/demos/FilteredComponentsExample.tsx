/**
 * Filtered Components Example
 *
 * Demonstrates how to restrict which node types are available in the palette.
 * Useful for creating simplified or specialized workflows.
 */

import { useRef, useState } from 'react'

import type { AgentFlowInstance, FlowData } from '@flowise/agentflow'
import { Agentflow } from '@flowise/agentflow'

import { apiBaseUrl, token } from '../config'

const initialFlow: FlowData = {
    nodes: [
        {
            id: 'startAgentflow_0',
            type: 'agentflowNode',
            position: { x: 200, y: 200 },
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

// Different preset configurations
const presets = {
    full: {
        name: 'Full Access',
        description: 'All nodes available',
        components: undefined // undefined = all nodes
    },
    simple: {
        name: 'Simple Chat',
        description: 'Basic LLM flow nodes only',
        components: ['llmAgentflow', 'directReplyAgentflow']
    },
    agent: {
        name: 'Agent Builder',
        description: 'Agent and tool nodes',
        components: ['agentAgentflow', 'toolAgentflow', 'retrieverAgentflow', 'directReplyAgentflow']
    },
    conditional: {
        name: 'Conditional Flow',
        description: 'Branching and control flow',
        components: ['conditionAgentflow', 'conditionAgentAgentflow', 'loopAgentflow', 'humanInputAgentflow', 'llmAgentflow']
    },
    integration: {
        name: 'Integration',
        description: 'External services and functions',
        components: ['httpAgentflow', 'customFunctionAgentflow', 'executeFlowAgentflow', 'directReplyAgentflow']
    }
}

type PresetKey = keyof typeof presets

export function FilteredComponentsExample() {
    // Config loaded from environment variables
    const agentflowRef = useRef<AgentFlowInstance>(null)
    const [selectedPreset, setSelectedPreset] = useState<PresetKey>('full')
    const [key, setKey] = useState(0) // Used to force re-render when preset changes

    const handlePresetChange = (preset: PresetKey) => {
        setSelectedPreset(preset)
        setKey((k) => k + 1) // Force re-mount to apply new components filter
    }

    const currentPreset = presets[selectedPreset]

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Preset Selector */}
            <div
                style={{
                    padding: '16px 20px',
                    background: '#fff',
                    borderBottom: '1px solid #e0e0e0'
                }}
            >
                <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Select Component Preset</h3>
                    <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>
                        The <code>components</code> prop restricts which node types appear in the palette.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(Object.keys(presets) as PresetKey[]).map((key) => {
                        const preset = presets[key]
                        const isSelected = selectedPreset === key
                        return (
                            <button
                                key={key}
                                onClick={() => handlePresetChange(key)}
                                style={{
                                    padding: '10px 16px',
                                    background: isSelected ? '#1976d2' : '#f5f5f5',
                                    color: isSelected ? '#fff' : '#333',
                                    border: `1px solid ${isSelected ? '#1976d2' : '#e0e0e0'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{preset.name}</div>
                                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>{preset.description}</div>
                            </button>
                        )
                    })}
                </div>

                {/* Show current filter */}
                <div
                    style={{
                        marginTop: '12px',
                        padding: '10px 12px',
                        background: '#f8f9fa',
                        borderRadius: '6px',
                        fontSize: '13px'
                    }}
                >
                    <strong>components=</strong>
                    {currentPreset.components ? (
                        <code style={{ color: '#1976d2' }}>{JSON.stringify(currentPreset.components)}</code>
                    ) : (
                        <span style={{ color: '#666' }}>undefined (all nodes)</span>
                    )}
                </div>
            </div>

            {/* Canvas - re-mounts when key changes */}
            <div style={{ flex: 1 }} key={key}>
                <Agentflow
                    ref={agentflowRef}
                    apiBaseUrl={apiBaseUrl}
                    token={token ?? undefined}
                    initialFlow={initialFlow}
                    components={currentPreset.components}
                    showDefaultHeader={false}
                />
            </div>
        </div>
    )
}

export const FilteredComponentsExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData',
    components: 'string[] (preset-based)',
    showDefaultHeader: false
}
