/**
 * Custom Node Example
 *
 * Demonstrates how a node can carry its own InputParam[] definitions
 * in data.inputs, bypassing the API schema. The node includes show/hide
 * conditions so double-clicking it opens the real EditNodeDialog with
 * conditional field visibility.
 *
 * A side panel shows the live visibility state (input values, stripped
 * values, and per-field visibility map) as the node is edited.
 */

import { useCallback, useMemo, useState } from 'react'

import type { FlowData, HeaderRenderProps, InputParam } from '@flowiseai/agentflow'
import { Agentflow, evaluateFieldVisibility, stripHiddenFieldValues } from '@flowiseai/agentflow'

import { apiBaseUrl, token } from '../config'

// ── Custom node InputParam definitions with show/hide conditions ──────────

const customNodeInputParams: InputParam[] = [
    {
        id: 'provider',
        name: 'provider',
        label: 'Model Provider',
        type: 'options',
        options: [
            { label: 'OpenAI', name: 'openAI' },
            { label: 'Google', name: 'google' },
            { label: 'Anthropic', name: 'anthropic' }
        ]
    },
    {
        id: 'openAIModel',
        name: 'openAIModel',
        label: 'OpenAI Model',
        type: 'options',
        options: [
            { label: 'GPT-4o', name: 'gpt-4o' },
            { label: 'GPT-4o Mini', name: 'gpt-4o-mini' },
            { label: 'o1', name: 'o1' }
        ],
        show: { provider: 'openAI' }
    },
    {
        id: 'googleModel',
        name: 'googleModel',
        label: 'Google Model',
        type: 'options',
        options: [
            { label: 'Gemini 2.0 Flash', name: 'gemini-2.0-flash' },
            { label: 'Gemini 2.5 Pro', name: 'gemini-2.5-pro' }
        ],
        show: { provider: 'google' }
    },
    {
        id: 'anthropicModel',
        name: 'anthropicModel',
        label: 'Anthropic Model',
        type: 'options',
        options: [
            { label: 'Claude Sonnet 4', name: 'claude-sonnet-4' },
            { label: 'Claude Opus 4', name: 'claude-opus-4' }
        ],
        show: { provider: 'anthropic' }
    },
    {
        id: 'enableMemory',
        name: 'enableMemory',
        label: 'Enable Memory',
        type: 'boolean'
    },
    {
        id: 'memoryType',
        name: 'memoryType',
        label: 'Memory Type',
        type: 'options',
        options: [
            { label: 'Buffer Window', name: 'bufferWindow' },
            { label: 'Token Buffer', name: 'tokenBuffer' },
            { label: 'Summary', name: 'summary' }
        ],
        show: { enableMemory: true }
    },
    {
        id: 'windowSize',
        name: 'windowSize',
        label: 'Window Size',
        type: 'number',
        default: 5,
        show: { enableMemory: true, memoryType: 'bufferWindow' }
    },
    {
        id: 'maxTokens',
        name: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        default: 2000,
        show: { enableMemory: true, memoryType: 'tokenBuffer' }
    },
    {
        id: 'conditions',
        name: 'conditions',
        label: 'Condition',
        type: 'array',
        array: [
            {
                id: 'variable',
                name: 'variable',
                label: 'Variable',
                type: 'string'
            },
            {
                id: 'operation',
                name: 'operation',
                label: 'Operation',
                type: 'options',
                options: [
                    { label: 'Equals', name: 'equals' },
                    { label: 'Contains', name: 'contains' },
                    { label: 'Is Empty', name: 'isEmpty' }
                ]
            },
            {
                id: 'value',
                name: 'value',
                label: 'Value',
                type: 'string',
                hide: { 'conditions[$index].operation': 'isEmpty' }
            }
        ]
    },
    {
        id: 'outputFormat',
        name: 'outputFormat',
        label: 'Output Format',
        type: 'options',
        options: [
            { label: 'Text', name: 'text' },
            { label: 'JSON', name: 'json' },
            { label: 'Markdown', name: 'markdown' }
        ]
    },
    {
        id: 'schema',
        name: 'schema',
        label: 'Output Schema',
        type: 'string',
        placeholder: 'Define the output structure...',
        hide: { outputFormat: 'text' }
    },
    {
        id: 'apiKey',
        name: 'apiKey',
        label: 'API Key',
        type: 'string',
        description: 'Shown for any provider (regex match)',
        show: { provider: '(openAI|google|anthropic)' }
    },
    {
        id: 'streamingSupport',
        name: 'streamingSupport',
        label: 'Enable Streaming',
        type: 'boolean',
        description: 'Available for OpenAI and Anthropic',
        show: { provider: ['openAI', 'anthropic'] }
    }
]

// ── Canvas flow data with a custom node carrying its own input definitions ─

const initialInputValues: Record<string, unknown> = { provider: '', enableMemory: false, outputFormat: 'text' }

const canvasFlow: FlowData = {
    nodes: [
        {
            id: 'customNode_0',
            type: 'agentflowNode',
            position: { x: 300, y: 150 },
            data: {
                id: 'customNode_0',
                name: 'customNodeDemo',
                label: 'Custom Node',
                color: '#64B5F6',
                inputs: customNodeInputParams,
                inputValues: initialInputValues,
                outputAnchors: [{ id: 'customNode_0-output-0', name: 'output', label: 'Output', type: 'string' }]
            }
        }
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
}

// ── Side panel for live visibility state ───────────────────────────────────

type VisibilityTab = 'values' | 'stripped' | 'visibility'

function VisibilityStatePanel({ inputValues }: { inputValues: Record<string, unknown> }) {
    const [tab, setTab] = useState<VisibilityTab>('values')

    const evaluated = useMemo(() => evaluateFieldVisibility(customNodeInputParams, inputValues), [inputValues])
    const stripped = useMemo(() => stripHiddenFieldValues(customNodeInputParams, inputValues), [inputValues])
    const visibilityMap = useMemo(() => Object.fromEntries(evaluated.map((p) => [p.name, p.display])), [evaluated])

    const visibleCount = evaluated.filter((p) => p.display).length
    const hiddenCount = evaluated.filter((p) => !p.display).length

    const tabData: Record<VisibilityTab, unknown> = {
        values: inputValues,
        stripped,
        visibility: visibilityMap
    }

    const tabButton = (id: VisibilityTab, label: string) => (
        <button
            onClick={() => setTab(id)}
            style={{
                flex: 1,
                padding: '10px',
                background: tab === id ? '#313244' : 'transparent',
                color: tab === id ? '#cba6f7' : '#6c7086',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 600
            }}
        >
            {label}
        </button>
    )

    return (
        <div
            style={{
                width: '300px',
                minHeight: 0,
                background: '#1e1e2e',
                color: '#cdd6f4',
                display: 'flex',
                flexDirection: 'column',
                fontSize: '13px',
                fontFamily: 'monospace',
                borderLeft: '1px solid #313244',
                overflow: 'hidden'
            }}
        >
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #313244' }}>
                {tabButton('values', 'Input Values')}
                {tabButton('stripped', 'Stripped')}
                {tabButton('visibility', 'Visibility')}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '12px', padding: '10px 14px', borderBottom: '1px solid #313244' }}>
                <span>
                    <span style={{ color: '#a6e3a1' }}>visible:</span> {visibleCount}
                </span>
                <span>
                    <span style={{ color: '#f38ba8' }}>hidden:</span> {hiddenCount}
                </span>
            </div>

            {/* JSON payload */}
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                    {JSON.stringify(tabData[tab], null, 2)}
                </pre>
            </div>
        </div>
    )
}

// ── Component ──────────────────────────────────────────────────────────────

export function CustomNodeExample() {
    const [inputValues, setInputValues] = useState<Record<string, unknown>>(initialInputValues)

    const handleFlowChange = useCallback((flow: FlowData) => {
        const node = flow.nodes.find((n) => n.id === 'customNode_0')
        if (node?.data?.inputValues) {
            setInputValues(node.data.inputValues)
        }
    }, [])

    const renderHeader = useCallback(
        (_props: HeaderRenderProps) => (
            <div
                style={{
                    padding: '8px 16px',
                    background: '#fafafa',
                    borderBottom: '1px solid #e0e0e0',
                    fontSize: '13px',
                    color: '#666'
                }}
            >
                <strong>Custom Node Demo</strong> — Double-click the node to open EditNodeDialog with show/hide conditions.
            </div>
        ),
        []
    )

    return (
        <div style={{ display: 'flex', height: '100%' }}>
            <div style={{ flex: 1 }}>
                <Agentflow
                    apiBaseUrl={apiBaseUrl}
                    token={token ?? undefined}
                    initialFlow={canvasFlow}
                    onFlowChange={handleFlowChange}
                    renderHeader={renderHeader}
                />
            </div>
            <VisibilityStatePanel inputValues={inputValues} />
        </div>
    )
}

export const CustomNodeExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    initialFlow: 'FlowData (custom node with data.inputs)',
    onFlowChange: '(flow: FlowData) => void',
    renderHeader: '(props: HeaderRenderProps) => ReactNode'
}
