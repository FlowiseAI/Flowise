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

// Types
export type {
    // Instance
    AgentFlowInstance,
    // Main props
    AgentflowProps,
    AgentflowState,
    // API
    ApiResponse,
    Chatflow,
    // Context
    ConfigContextValue,
    // Flow data
    EdgeData,
    FlowConfig,
    FlowData,
    FlowEdge,
    FlowNode,
    // Render props
    HeaderRenderProps,
    // Node data
    InputAnchor,
    InputParam,
    NodeData,
    NodeInput,
    NodeOutput,
    OutputAnchor,
    PaletteRenderProps,
    RequestInterceptor,
    // Validation
    ValidationError,
    ValidationResult,
    Viewport
} from './core/types'

// Utilities (for advanced usage)
export { filterNodesByComponents, isAgentflowNode } from './core/node-catalog'
export { AGENTFLOW_ICONS, DEFAULT_AGENTFLOW_NODES, getAgentflowIcon, getNodeColor } from './core/node-config'
export { evaluateFieldVisibility, evaluateParamVisibility, stripHiddenFieldValues } from './core/utils/fieldVisibility'
export { validateFlow } from './core/validation'
