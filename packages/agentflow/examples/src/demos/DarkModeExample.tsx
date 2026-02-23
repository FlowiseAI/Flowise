/**
 * Dark Mode Example
 *
 * Demonstrates the agentflow canvas with dark theme styling.
 * The nodes and edges automatically adapt to the dark theme.
 */

import { useRef, useState } from 'react'

import type { AgentFlowInstance, FlowData } from '@flowise/agentflow'
import { Agentflow } from '@flowise/agentflow'
import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'

import { apiBaseUrl, token } from '../config'

const sampleFlow: FlowData = {
    nodes: [
        {
            id: 'startAgentflow_0',
            type: 'agentflowNode',
            position: { x: 100, y: 150 },
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
            id: 'agentAgentflow_0',
            type: 'agentflowNode',
            position: { x: 400, y: 150 },
            data: {
                id: 'agentAgentflow_0',
                name: 'agentAgentflow',
                label: 'AI Assistant',
                color: '#4DD0E1',
                outputAnchors: [{ id: 'agentAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }],
                inputValues: {
                    agentModel: 'chatAnthropic',
                    agentModelConfig: {
                        modelName: 'claude-3-5-sonnet'
                    }
                }
            }
        },
        {
            id: 'directReplyAgentflow_0',
            type: 'agentflowNode',
            position: { x: 700, y: 150 },
            data: {
                id: 'directReplyAgentflow_0',
                name: 'directReplyAgentflow',
                label: 'Reply',
                color: '#4DDBBB',
                outputAnchors: [{ id: 'directReplyAgentflow_0-output-0', name: 'output', label: 'Output', type: 'string' }]
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
        },
        {
            id: 'edge-2',
            source: 'agentAgentflow_0',
            sourceHandle: 'agentAgentflow_0-output-0',
            target: 'directReplyAgentflow_0',
            targetHandle: 'directReplyAgentflow_0',
            type: 'agentflowEdge',
            data: { sourceColor: '#4DD0E1', targetColor: '#4DDBBB' }
        }
    ],
    viewport: { x: 0, y: 0, zoom: 1 }
}

export function DarkModeExample() {
    // Config loaded from environment variables
    const agentflowRef = useRef<AgentFlowInstance>(null)
    const [isDark, setIsDark] = useState(true)

    const darkTheme = createTheme({
        palette: {
            mode: isDark ? 'dark' : 'light',
            background: {
                default: isDark ? '#1a1a2e' : '#f5f5f5',
                paper: isDark ? '#16213e' : '#ffffff'
            },
            primary: {
                main: '#4DD0E1'
            }
        }
    })

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Theme Toggle */}
                <div
                    style={{
                        padding: '12px 16px',
                        background: isDark ? '#16213e' : '#fff',
                        borderBottom: `1px solid ${isDark ? '#2a2a4a' : '#e0e0e0'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >
                    <span style={{ color: isDark ? '#fff' : '#333', fontWeight: 500 }}>Theme:</span>
                    <button
                        onClick={() => setIsDark(!isDark)}
                        style={{
                            padding: '8px 16px',
                            background: isDark ? '#4DD0E1' : '#333',
                            color: isDark ? '#000' : '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        {isDark ? 'Switch to Light' : 'Switch to Dark'}
                    </button>
                </div>

                {/* Canvas */}
                <div style={{ flex: 1 }}>
                    <Agentflow
                        ref={agentflowRef}
                        apiBaseUrl={apiBaseUrl}
                        token={token ?? undefined}
                        initialFlow={sampleFlow}
                        isDarkMode={isDark}
                        showDefaultHeader={false}
                    />
                </div>
            </div>
        </ThemeProvider>
    )
}

export const DarkModeExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData (sample flow)',
    isDarkMode: '{isDark}',
    showDefaultHeader: false
}
