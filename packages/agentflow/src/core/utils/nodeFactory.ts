import type { FlowNode, NodeData, OutputAnchor } from '../types'

import { buildDynamicOutputAnchors } from './dynamicOutputAnchors'

/**
 * Map from NodeData.type to the ReactFlow node type key.
 * Any type not listed here defaults to 'agentflowNode'.
 */
const NODE_TYPE_MAP: Record<string, string> = {
    Iteration: 'iteration',
    StickyNote: 'stickyNote'
}

/**
 * Resolve the ReactFlow node type from a NodeData type string.
 */
export function resolveNodeType(nodeDataType: string): string {
    return NODE_TYPE_MAP[nodeDataType] ?? 'agentflowNode'
}

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
 * Pick only the properties that belong to NodeData from a server API response.
 * Strips server-only metadata (filePath, badge, author, loadMethods, etc.)
 * and runtime-only state (status, error, warning, hint, validationErrors)
 * that should not be persisted in flow data.
 *
 * Mirrors the allowlist used by generateExportFlowData in agentflow v2
 * (packages/ui/src/utils/genericHelper.js).
 */
function pickNodeData(raw: NodeData): NodeData {
    return {
        id: raw.id,
        name: raw.name,
        label: raw.label,
        type: raw.type,
        category: raw.category,
        description: raw.description,
        version: raw.version,
        baseClasses: raw.baseClasses,
        inputs: raw.inputs,
        inputValues: raw.inputValues,
        outputs: raw.outputs,
        inputAnchors: raw.inputAnchors,
        outputAnchors: raw.outputAnchors,
        color: raw.color,
        icon: raw.icon,
        hideInput: raw.hideInput
    }
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

    // Credential — extract top-level credential property and prepend to input definitions
    const rawCredential = (nodeData as Record<string, unknown>).credential as
        | { name?: string; label?: string; type?: string; credentialNames?: string[]; optional?: boolean }
        | undefined

    if (rawCredential?.credentialNames?.length) {
        inputDefinitions.unshift({
            ...rawCredential,
            id: `${newNodeId}-input-FLOWISE_CREDENTIAL_ID-credential`,
            name: 'FLOWISE_CREDENTIAL_ID',
            label: rawCredential.label ?? 'Credential',
            type: 'credential'
        })
    }

    // Initialize default input values from definitions using initializeDefaultNodeData
    const initialInputValues = initializeDefaultNodeData(inputDefinitions)

    // Initialize outputs — condition nodes use buildDynamicOutputAnchors so that
    // the initial outputAnchors match the v2 format (numeric label/name + description)
    let outputAnchors: OutputAnchor[] | Array<{ id: string; label: string; name: string }> = []
    if (isAgentflow) {
        if (nodeData.name === 'conditionAgentflow') {
            const conditions = initialInputValues.conditions
            const conditionCount = Array.isArray(conditions) ? conditions.length : 0
            outputAnchors = buildDynamicOutputAnchors(newNodeId, conditionCount, 'Condition', true)
        } else if (nodeData.name === 'conditionAgentAgentflow') {
            // ConditionAgent outputs match scenario count exactly (no separate Else port)
            const scenarios = initialInputValues.conditionAgentScenarios
            const scenarioCount = Array.isArray(scenarios) ? scenarios.length : 0
            outputAnchors = buildDynamicOutputAnchors(newNodeId, scenarioCount, 'Scenario', false)
        } else {
            outputAnchors = createAgentFlowOutputs(nodeData, newNodeId)
        }
    }

    // Create initialized node data — pickNodeData strips server-only metadata
    const initializedData: NodeData = {
        ...pickNodeData(nodeData),
        id: newNodeId,
        inputs: inputDefinitions, // Keep parameter definitions
        inputValues: { ...initialInputValues, ...(nodeData.inputValues || {}) }, // Merge defaults with existing values
        inputAnchors: inputAnchors as NodeData['inputAnchors'],
        outputAnchors: outputAnchors as NodeData['outputAnchors']
    }

    return initializedData
}
