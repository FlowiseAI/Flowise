import type { FlowEdge, FlowNode, NodeData } from '@/core/types'

/**
 * Create a {@link FlowNode} with sensible defaults.
 *
 * The returned node uses `id` for every identity field (`id`, `data.id`,
 * `data.name`, `data.label`) so a single string is enough for most tests.
 * Pass `overrides` to customise any property.
 *
 * @example
 * makeFlowNode('a')
 * makeFlowNode('a', { type: 'agentFlow', selected: true })
 * makeFlowNode('a', { data: { id: 'a', name: 'llmAgentflow', label: 'LLM' } })
 */
export const makeFlowNode = (id: string, overrides?: Partial<FlowNode>): FlowNode => ({
    id,
    type: 'customNode',
    position: { x: 0, y: 0 },
    data: { id, name: id, label: id },
    ...overrides
})

/**
 * Create a {@link FlowEdge} between two node ids.
 *
 * The edge `id` is derived as `"${source}-${target}"` by default.
 *
 * @example
 * makeFlowEdge('a', 'b')
 * makeFlowEdge('a', 'b', { selected: true, animated: true })
 */
export const makeFlowEdge = (source: string, target: string, overrides?: Partial<FlowEdge>): FlowEdge => ({
    id: `${source}-${target}`,
    source,
    target,
    type: 'default',
    ...overrides
})

/**
 * Create a {@link NodeData} descriptor (the `data` payload of a node).
 *
 * Useful for testing palette search, node filtering, and `initNode`.
 *
 * @example
 * makeNodeData()
 * makeNodeData({ name: 'llmAgentflow', label: 'LLM', category: 'AI' })
 */
export const makeNodeData = (overrides?: Partial<NodeData>): NodeData =>
    ({ id: '', name: 'testNode', label: 'Test Node', ...overrides } as NodeData)
