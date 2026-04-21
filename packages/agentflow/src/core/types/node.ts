// ============================================================================
// Node & Edge Data Types
// ============================================================================

/**
 * Shared metadata between GET /api/v1/nodes payloads and canvas {@link NodeData}.
 * Excludes `inputs` (API: schema array vs canvas: value map) and other API-only or canvas-only fields.
 */
export interface NodeDefinitionBase {
    name: string
    label: string
    type?: string
    category?: string
    description?: string
    version?: number
    baseClasses?: string[]
    outputs?: NodeOutput[]
    color?: string
    icon?: string
    hideInput?: boolean
    badge?: string
    tags?: string[]
    documentation?: string
    /** Schema object (from API) or credential ID string (set at runtime when user selects a credential). */
    credential?: string | { credentialNames?: string[]; label?: string; type?: string; optional?: boolean }
    inputAnchors?: InputAnchor[]
    outputAnchors?: OutputAnchor[]
    selected?: boolean
    [key: string]: unknown
}

/**
 * Used for GET /api/v1/nodes, the node palette, drag payloads, and `initNode()` → {@link NodeData}.
 */
export interface NodeDataSchema extends NodeDefinitionBase {
    inputs?: InputParam[] // Schema array (from API or equivalent definitions)
}

export interface NodeData extends NodeDefinitionBase {
    id: string
    inputParams?: InputParam[] // Parameter definitions
    inputs?: Record<string, unknown> // Actual values entered by users
    // Status properties
    status?: 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'STOPPED' | 'TERMINATED'
    error?: string
    warning?: string
    hint?: string
    validationErrors?: string[]
}

export interface NodeInput {
    label: string
    name: string
    type: string
    optional?: boolean
}

export interface NodeOutput {
    label: string
    name: string
    type: string
}

export interface InputAnchor {
    id: string
    name: string
    label: string
    type: string
    optional?: boolean
    description?: string
}

export interface OutputAnchor {
    id: string
    name: string
    label: string
    type: string
    description?: string
}

export interface InputParam {
    id: string
    name: string
    label: string
    type: string
    default?: unknown
    optional?: boolean
    options?: Array<{ label: string; name: string; description?: string; client?: Array<ClientType> } | string>
    placeholder?: string
    rows?: number
    description?: string
    acceptVariable?: boolean
    additionalParams?: boolean
    show?: Record<string, unknown>
    hide?: Record<string, unknown>
    client?: Array<ClientType>
    display?: boolean
    minItems?: number
    maxItems?: number // No agentflow nodes set this today — supported for forward-compat
    array?: InputParam[] // Sub-field definitions for array-type params
    loadMethod?: string // Registry key for async option loading (asyncOptions / asyncMultiOptions)
    loadConfig?: boolean // When true, renders a config accordion beneath the async dropdown for the selected component
    credentialNames?: string[] // If set, bypasses loadMethod and fetches matching credentials
    codeLanguage?: string // Language hint for code editor (e.g. 'javascript', 'python', 'json')
    codeExample?: string // Example code snippet shown via an "Example" button
    refresh?: boolean // When true, shows a refresh button next to async dropdowns to re-fetch options
}

export interface NodeConfigEntry {
    node: string
    nodeId: string
    label: string
    name: string
    type: string
    enabled?: boolean
    schema?: Record<string, string> | Array<{ name: string; type: string }>
}

export interface EdgeData {
    sourceColor?: string
    targetColor?: string
    edgeLabel?: string
    isHumanInput?: boolean
    [key: string]: unknown
}

export type ClientType = 'agentflowv2' | 'agentflowsdk'
