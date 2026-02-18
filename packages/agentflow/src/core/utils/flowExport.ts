import type { FlowEdge, FlowNode } from '../types'

// TODO: Integrate with save/export flow to strip credentials before persisting
/**
 * Generate export-friendly flow data (strips sensitive info)
 */
export function generateExportFlowData(flowData: { nodes: FlowNode[]; edges: FlowEdge[] }): { nodes: FlowNode[]; edges: FlowEdge[] } {
    const nodes = flowData.nodes.map((node) => ({
        ...node,
        selected: false,
        data: {
            ...node.data,
            // Remove credential IDs for export
            credential: undefined
        }
    }))

    const edges = flowData.edges.map((edge) => ({
        ...edge,
        selected: false
    }))

    return { nodes, edges }
}
