/**
 * Google A2A (Agent-to-Agent) Protocol Type Definitions
 *
 * Based on the A2A specification:
 * @see https://github.com/google/A2A
 *
 * Protocol version: 0.3.0
 */

// ─── AgentCard ───────────────────────────────────────────────────────────

export interface AgentCapabilities {
    streaming?: boolean
    pushNotifications?: boolean
    stateTransitionHistory?: boolean
}

export interface AgentSkill {
    id: string
    name: string
    description?: string
    tags?: string[]
    examples?: string[]
    inputModes?: string[]
    outputModes?: string[]
}

export interface AgentCard {
    name: string
    description: string
    url: string
    provider?: {
        organization: string
        url?: string
    }
    version: string
    protocolVersion: string
    defaultInputModes: string[]
    defaultOutputModes: string[]
    capabilities: AgentCapabilities
    skills: AgentSkill[]
    authentication?: {
        schemes: string[]
        credentials?: string
    }
}

// ─── JSON-RPC Envelope ───────────────────────────────────────────────────

export interface JsonRpcRequest {
    jsonrpc: '2.0'
    id: string | number | null
    method: string
    params?: Record<string, unknown>
}

export interface JsonRpcResponse {
    jsonrpc: '2.0'
    id: string | number | null
    result?: unknown
    error?: JsonRpcError
}

export interface JsonRpcError {
    code: number
    message: string
    data?: unknown
}

// ─── Task ────────────────────────────────────────────────────────────────

export type TaskState =
    | 'submitted'
    | 'working'
    | 'input-required'
    | 'completed'
    | 'failed'
    | 'canceled'

export interface TaskStatus {
    state: TaskState
    message?: Message
    timestamp?: string
}

export interface Task {
    kind: 'task'
    id: string
    contextId?: string
    status: TaskStatus
    history?: Message[]
    artifacts?: Artifact[]
    metadata?: Record<string, unknown>
}

// ─── Message ─────────────────────────────────────────────────────────────

export interface Message {
    kind?: 'message'
    messageId?: string
    role: 'user' | 'agent'
    parts: Part[]
    contextId?: string
    taskId?: string
    metadata?: Record<string, unknown>
}

// ─── Part Types ──────────────────────────────────────────────────────────

export type Part = TextPart | FilePart | DataPart

export interface TextPart {
    kind: 'text'
    text: string
    metadata?: Record<string, unknown>
}

export interface FilePart {
    kind: 'file'
    file: {
        name?: string
        mimeType?: string
        bytes?: string // base64 encoded
        uri?: string
    }
    metadata?: Record<string, unknown>
}

export interface DataPart {
    kind: 'data'
    data: Record<string, unknown>
    metadata?: Record<string, unknown>
}

// ─── Artifact ────────────────────────────────────────────────────────────

export interface Artifact {
    kind?: 'artifact'
    artifactId?: string
    name?: string
    description?: string
    parts: Part[]
    metadata?: Record<string, unknown>
    index?: number
    append?: boolean
    lastChunk?: boolean
}

// ─── Method Params ──────────────────────────────────────────────────────

export interface TaskSendParams {
    id?: string
    contextId?: string
    message: Message
    metadata?: Record<string, unknown>
}

export interface TaskGetParams {
    id: string
    historyLength?: number
    metadata?: Record<string, unknown>
}

export interface TaskCancelParams {
    id: string
    metadata?: Record<string, unknown>
}

// ─── Default Protocol Values ─────────────────────────────────────────────

export const A2A_PROTOCOL_VERSION = '0.3.0'
export const AGENT_CARD_WELL_KNOWN_PATH = '/.well-known/agent-card.json'
export const AGENT_WELL_KNOWN_PATH = '/.well-known/agent.json'
export const DEFAULT_INPUT_MODES = ['text/plain']
export const DEFAULT_OUTPUT_MODES = ['text/plain']
