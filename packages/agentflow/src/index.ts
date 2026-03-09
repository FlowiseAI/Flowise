// ===========================================
// @flowiseai/agentflow - Public API
// ===========================================

// Main component
export { Agentflow, default as AgentflowDefault } from './Agentflow'

// Root provider
export { AgentflowProvider } from './AgentflowProvider'

// Primary hook
export { useAgentflow } from './useAgentflow'

// Context hooks (for advanced usage)
export { useAgentflowContext, useApiContext, useConfigContext } from './infrastructure/store'

// Load method registry (for dynamic API dispatch from node input loadMethod strings)
export type { ApiServices } from './infrastructure/api'
export { getLoadMethod } from './infrastructure/api'

// Types
export type {
    // Instance
    AgentFlowInstance,
    // Main props
    AgentflowProps,
    AgentflowState,
    // Context
    ApiContextValue,
    ApiResponse,
    // API
    Chatflow,
    ConfigContextValue,
    Credential,
    EdgeData,
    FlowConfig,
    // Flow data
    FlowData,
    FlowEdge,
    FlowNode,
    // Render props
    HeaderRenderProps,
    InputAnchor,
    InputParam,
    Model,
    // Node data
    NodeData,
    NodeInput,
    NodeOutput,
    OutputAnchor,
    PaletteRenderProps,
    Tool,
    ValidationError,
    // Validation
    ValidationResult,
    Viewport
} from './core/types'

// Utilities (for advanced usage)
export { filterNodesByComponents, isAgentflowNode } from './core/node-catalog'
export { AGENTFLOW_ICONS, DEFAULT_AGENTFLOW_NODES, getAgentflowIcon, getNodeColor } from './core/node-config'
export { evaluateFieldVisibility, evaluateParamVisibility, stripHiddenFieldValues } from './core/utils/fieldVisibility'
export { validateFlow } from './core/validation'
