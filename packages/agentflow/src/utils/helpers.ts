import { cloneDeep } from 'lodash'

export const getUniqueNodeId = (nodeData: any, nodes: any[]) => {
    let suffix = 0
    let baseId = `${nodeData.name}_${suffix}`

    while (nodes.some((node) => node.id === baseId)) {
        suffix += 1
        baseId = `${nodeData.name}_${suffix}`
    }

    return baseId
}

export const getUniqueNodeLabel = (nodeData: any, nodes: any[]) => {
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

const createAgentFlowOutputs = (nodeData: any, newNodeId: string) => {
    if (nodeData.hideOutput) return []

    if (nodeData.outputs?.length) {
        return nodeData.outputs.map((_: any, index: number) => ({
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

const initializeOutputAnchors = (nodeData: any, newNodeId: string, isAgentflow: boolean) => {
    return isAgentflow ? createAgentFlowOutputs(nodeData, newNodeId) : []
}

export const initializeDefaultNodeData = (nodeParams: any[]) => {
    const initialValues: any = {}

    for (let i = 0; i < nodeParams.length; i += 1) {
        const input = nodeParams[i]
        initialValues[input.name] = input.default || ''
    }

    return initialValues
}

export const initNode = (nodeData: any, newNodeId: string, isAgentflow: boolean = false) => {
    const inputAnchors: any[] = []
    const inputParams: any[] = []
    const incoming = nodeData.inputs ? nodeData.inputs.length : 0

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

    // Inputs
    for (let i = 0; i < incoming; i += 1) {
        const newInput = {
            ...nodeData.inputs[i],
            id: `${newNodeId}-input-${nodeData.inputs[i].name}-${nodeData.inputs[i].type}`
        }
        if (whitelistTypes.includes(nodeData.inputs[i].type)) {
            inputParams.push(newInput)
        } else {
            inputAnchors.push(newInput)
        }
    }

    // Credential
    if (nodeData.credential) {
        const newInput = {
            ...nodeData.credential,
            id: `${newNodeId}-input-${nodeData.credential.name}-${nodeData.credential.type}`
        }
        inputParams.unshift(newInput)
    }

    // Outputs
    const outputAnchors = initializeOutputAnchors(nodeData, newNodeId, isAgentflow)

    const inputs = initializeDefaultNodeData(inputParams)

    return {
        id: newNodeId,
        name: nodeData.name,
        label: nodeData.label,
        version: nodeData.version || 1.0,
        type: nodeData.type || nodeData.name,
        baseClasses: nodeData.baseClasses || [],
        category: nodeData.category,
        description: nodeData.description || '',
        inputAnchors,
        inputs,
        inputParams,
        outputAnchors,
        outputs: nodeData.outputs || {},
        color: nodeData.color,
        icon: nodeData.icon,
        selected: false,
        status: undefined,
        hideOutput: nodeData.hideOutput
    }
}

export const isValidConnectionAgentflowV2 = (connection: any, reactFlowInstance: any) => {
    const sourceNode = reactFlowInstance.getNode(connection.source)
    const targetNode = reactFlowInstance.getNode(connection.target)

    if (!sourceNode || !targetNode) return false

    // Check if source and target are within the same iteration node
    const isWithinIterationNode = sourceNode.parentNode && targetNode.parentNode && sourceNode.parentNode === targetNode.parentNode

    // Don't allow connections between nodes in different iteration nodes
    if (sourceNode.parentNode !== targetNode.parentNode && (sourceNode.parentNode || targetNode.parentNode)) {
        return false
    }

    // Check if source handle allows multiple connections
    const existingEdges = reactFlowInstance.getEdges()
    const existingConnectionsFromSource = existingEdges.filter(
        (edge: any) => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle
    )

    // Most agentflow nodes can have multiple outgoing connections
    // But we should check if there's already a connection to the same target handle
    const existingConnectionToTarget = existingEdges.find(
        (edge: any) =>
            edge.source === connection.source && edge.target === connection.target && edge.targetHandle === connection.targetHandle
    )

    if (existingConnectionToTarget) {
        return false
    }

    return true
}

export const updateOutdatedNodeData = (componentNode: any, nodeData: any, isAgentflow: boolean = false) => {
    const clonedComponentNode = cloneDeep(componentNode)
    const clonedNodeData = cloneDeep(nodeData)

    // Update version
    clonedNodeData.version = clonedComponentNode.version

    // Re-initialize node with new data
    const newNodeData = initNode(clonedComponentNode, clonedNodeData.id, isAgentflow)

    // Preserve existing input values where they still exist
    for (const key in clonedNodeData.inputs) {
        if (newNodeData.inputs.hasOwnProperty(key)) {
            newNodeData.inputs[key] = clonedNodeData.inputs[key]
        }
    }

    return { ...clonedNodeData, ...newNodeData }
}

export const updateOutdatedNodeEdge = (nodeData: any, edges: any[]) => {
    const toBeRemovedEdges: any[] = []

    // Check if any input anchors were removed
    const currentInputAnchorIds = nodeData.inputAnchors.map((anchor: any) => anchor.id)
    const currentOutputAnchorIds = nodeData.outputAnchors.map((anchor: any) => anchor.id)

    edges.forEach((edge) => {
        // Check if edge's target handle still exists
        if (edge.target === nodeData.id) {
            const targetHandleId = edge.targetHandle
            if (!currentInputAnchorIds.some((id: string) => targetHandleId.includes(id))) {
                toBeRemovedEdges.push(edge)
            }
        }

        // Check if edge's source handle still exists
        if (edge.source === nodeData.id) {
            const sourceHandleId = edge.sourceHandle
            if (!currentOutputAnchorIds.some((id: string) => sourceHandleId.includes(id))) {
                toBeRemovedEdges.push(edge)
            }
        }
    })

    return toBeRemovedEdges
}
