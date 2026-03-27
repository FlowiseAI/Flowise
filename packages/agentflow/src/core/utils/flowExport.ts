import type { FlowEdge, FlowNode, NodeData } from '../types'

/** Sensitive input types that must not appear in exported flow data. */
const SENSITIVE_INPUT_TYPES = new Set(['password', 'file', 'folder'])

/**
 * Build an allowlisted copy of node data for export.
 * Mirrors the field allowlist in agentflow v2's generateExportFlowData
 * (packages/ui/src/utils/genericHelper.js) and strips:
 *   - credential references
 *   - password / file / folder input values
 *   - runtime-only state (status, error, warning, hint, validationErrors)
 */
function pickExportNodeData(data: NodeData): NodeData {
    const exported: NodeData = {
        id: data.id,
        name: data.name,
        label: data.label,
        version: data.version,
        type: data.type,
        color: data.color,
        hideInput: data.hideInput,
        baseClasses: data.baseClasses,
        tags: data.tags,
        category: data.category,
        description: data.description,
        inputs: data.inputs,
        inputAnchors: data.inputAnchors,
        outputAnchors: data.outputAnchors,
        outputs: data.outputs,
        icon: data.icon
    }

    // Strip sensitive values from inputValues (password, file, folder)
    if (data.inputValues) {
        const inputDefsByName = new Map((data.inputs || []).map((i) => [i.name, i]))
        const cleanedValues: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(data.inputValues)) {
            const inputDef = inputDefsByName.get(key)
            if (inputDef && SENSITIVE_INPUT_TYPES.has(inputDef.type)) continue
            cleanedValues[key] = value
        }
        exported.inputValues = cleanedValues
    }

    return exported
}

/**
 * Generate export-friendly flow data.
 * Uses an explicit allowlist (matching agentflow v2 behaviour) so that
 * server-only metadata and sensitive values never leak into exports.
 */
export function generateExportFlowData(flowData: { nodes: FlowNode[]; edges: FlowEdge[] }): { nodes: FlowNode[]; edges: FlowEdge[] } {
    const nodes = flowData.nodes.map((node) => ({
        ...node,
        selected: false,
        data: pickExportNodeData(node.data)
    }))

    const edges = flowData.edges.map((edge) => ({
        ...edge,
        selected: false
    }))

    return { nodes, edges }
}
