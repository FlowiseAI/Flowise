// Canvas Feature - Public API
// Container components (with state/logic)
import { AgentFlowEdge, AgentFlowNode, IterationNode, StickyNote } from './containers'

import './canvas.css'

// Presentational components
export type { AgentflowHeaderProps } from './components'
export { AgentflowHeader, ConnectionLine, createHeaderProps } from './components'

// Hooks
export { useDragAndDrop, useFlowHandlers, useFlowNodes } from './hooks'

// Node and edge type registrations for ReactFlow
export const nodeTypes = {
    agentflowNode: AgentFlowNode,
    stickyNote: StickyNote,
    iteration: IterationNode
}

export const edgeTypes = {
    agentflowEdge: AgentFlowEdge
}

// Re-export container components
export { AgentFlowEdge, AgentFlowNode, IterationNode, StickyNote }

// Utilities and styled components
export { getBuiltInAnthropicToolIcon, getBuiltInGeminiToolIcon, getBuiltInOpenAIToolIcon, renderNodeIcon } from './nodeIcons'
export { CardWrapper, StyledNodeToolbar } from './styled'
