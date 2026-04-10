// ============================================================================
// Flow Data Types
// ============================================================================

import type { EdgeData, NodeData } from './node'

export interface Viewport {
    x: number
    y: number
    zoom: number
}

export interface FlowNode {
    id: string
    type: string
    position: { x: number; y: number }
    data: NodeData
    parentNode?: string
    extent?: 'parent'
    selected?: boolean
    dragging?: boolean
    width?: number
    height?: number
}

export interface FlowEdge {
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    type: string
    data?: EdgeData
    selected?: boolean
    animated?: boolean
}

export interface FlowData {
    nodes: FlowNode[]
    edges: FlowEdge[]
    viewport?: Viewport
}

/** Callback type for flow data events (change, save, generate) */
export type FlowDataCallback = (flow: FlowData) => void

export interface FlowConfig {
    id?: string
    name?: string
    deployed?: boolean
    isPublic?: boolean
    type?: 'AGENTFLOW'
}

// ============================================================================
// Flow State Types
// ============================================================================

/** A single key-value update to flow state, used in nodes that modify state. */
export interface StateUpdate {
    key: string
    value: string // Can contain variable references (e.g. {{nodeId.data.instance}})
}
