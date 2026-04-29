// ===========================================
// @flowiseai/observe — Public API
// ===========================================

// Root provider (required — wrap your app or page with this)
export { ObserveProvider } from './infrastructure/store'

// Executions feature
export { ExecutionDetail, ExecutionsViewer } from './features/executions'

// Advanced usage — individual sub-components
export { ExecutionsListTable, NodeExecutionDetail } from './features/executions'

// Hooks (for consumers building custom UIs on top of observe infrastructure)
export { useExecutionPoll, useExecutionTree } from './features/executions'

// Context hooks
export { useObserveApi, useObserveConfig } from './infrastructure/store'

// Types
/* eslint-disable simple-import-sort/exports */
export type {
    // Execution domain
    AgentflowRef,
    Execution,
    ExecutionDetailProps,
    ExecutionFilters,
    ExecutionListParams,
    ExecutionListResponse,
    ExecutionsViewerProps,
    ExecutionState,
    ExecutionTreeNode,
    HumanInputParams,
    NodeExecutionData,
    NodeExecutionOutput,
    ObserveBaseProps,
    TimeMetadata,
    UsageMetadata
} from './core/types'
/* eslint-enable simple-import-sort/exports */
