import type { FlowNode, NodeData } from '../types'

/**
 * Generate a unique node ID based on existing nodes
 */
export function getUniqueNodeId(nodeData: NodeData, nodes: FlowNode[]): string {
    let suffix = 0
    let baseId = `${nodeData.name}_${suffix}`

    while (nodes.some((node) => node.id === baseId)) {
        suffix += 1
        baseId = `${nodeData.name}_${suffix}`
    }

    return baseId
}

/**
 * Generate a unique node label based on existing nodes
 */
export function getUniqueNodeLabel(nodeData: NodeData, nodes: FlowNode[]): string {
    if (nodeData.type === 'StickyNote') return nodeData.label
    if (nodeData.name === 'startAgentflow') return nodeData.label

    let suffix = 0
    let baseId = `${nodeData.name}_${suffix}`

    while (nodes.some((node) => node.id === baseId)) {
        suffix += 1
        baseId = `${nodeData.name}_${suffix}`
    }

    return `${nodeData.label} ${suffix}`
}

/**
 * Initialize default values for node parameters.
 * Falls back to '' for params without a default — needed by show/hide condition evaluation.
 */
function initializeDefaultNodeData(nodeParams: Array<{ name: string; default?: unknown }>): Record<string, unknown> {
    const initialValues: Record<string, unknown> = {}

    for (const input of nodeParams) {
        initialValues[input.name] = input.default ?? ''
    }

    return initialValues
}

/**
 * Create output anchors for agentflow nodes
 */
function createAgentFlowOutputs(nodeData: NodeData, newNodeId: string): Array<{ id: string; label: string; name: string }> {
    if ((nodeData as Record<string, unknown>).hideOutput) return []

    if (nodeData.outputs?.length) {
        return nodeData.outputs.map((_, index) => ({
            id: `${newNodeId}-output-${index}`,
            label: nodeData.label,
            name: nodeData.name
        }))
    }

    return [
        {
            id: `${newNodeId}-output-${nodeData.name}`,
            label: nodeData.label,
            name: nodeData.name
        }
    ]
}

/**
 * Initialize a node with proper anchors and default values
 * Converts API response (with inputs as definitions) to canvas node format
 */
export function initNode(nodeData: NodeData, newNodeId: string, isAgentflow = true): NodeData {
    const inputAnchors: Array<{ id: string; name: string; label: string; type: string }> = []
    const inputDefinitions: Array<{ id: string; name: string; label: string; type: string; default?: unknown; optional?: boolean }> = []

    // Get input definitions from API response (nodeData.inputs contains InputParam[] from API)
    const inputDefs = nodeData.inputs || nodeData.inputAnchors || []

    const whitelistTypes = [
        'asyncOptions',
        'asyncMultiOptions',
        'options',
        'multiOptions',
        'array',
        'datagrid',
        'string',
        'number',
        'boolean',
        'password',
        'json',
        'code',
        'date',
        'file',
        'folder',
        'tabs',
        'conditionFunction'
    ]

    // Process input definitions - separate into anchors vs parameters
    for (const input of inputDefs) {
        const newInput = {
            ...input,
            id: `${newNodeId}-input-${input.name}-${input.type}`
        }
        if (whitelistTypes.includes(input.type)) {
            inputDefinitions.push(newInput)
        } else {
            inputAnchors.push(newInput)
        }
    }

    // Initialize outputs
    const outputAnchors = isAgentflow ? createAgentFlowOutputs(nodeData, newNodeId) : []

    // Initialize default input values from definitions using initializeDefaultNodeData
    const initialInputValues = initializeDefaultNodeData(inputDefinitions)

    // Create initialized node data
    const initializedData: NodeData = {
        ...nodeData,
        id: newNodeId,
        inputs: inputDefinitions, // Keep parameter definitions
        inputValues: { ...initialInputValues, ...(nodeData.inputValues || {}) }, // Merge defaults with existing values
        inputAnchors: inputAnchors as NodeData['inputAnchors'],
        outputAnchors: outputAnchors as NodeData['outputAnchors']
    }

    return initializedData
}
