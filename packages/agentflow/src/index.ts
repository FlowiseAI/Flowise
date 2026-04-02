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
/* eslint-disable simple-import-sort/exports */
export type {
    // Instance
    AgentFlowInstance,
    // Main props
    AgentflowProps,
    AgentflowState,
    // API
    ApiResponse,
    Chatflow,
    ChatModel,
    Credential,
    Tool,
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
    StateUpdate,
    // Validation
    ValidationError,
    ValidationResult,
    Viewport
} from './core/types'
/* eslint-enable simple-import-sort/exports */

// Utilities (for advanced usage)
export { filterNodesByComponents, isAgentflowNode } from './core/node-catalog'
export { AGENTFLOW_ICONS, DEFAULT_AGENTFLOW_NODES, getAgentflowIcon, getNodeColor } from './core/node-config'
export { evaluateFieldVisibility, evaluateParamVisibility, stripHiddenFieldValues } from './core/utils/fieldVisibility'
export { validateFlow } from './core/validation'
