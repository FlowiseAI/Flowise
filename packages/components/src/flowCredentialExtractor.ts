/**
 * Represents a node in a Flowise flow
 */
interface FlowNode {
    id: string
    type: string
    data: {
        id: string
        type: string
        credential?: string
        inputs?: {
            modelName?: string
            [key: string]: any
        }
        [key: string]: any
    }
    [key: string]: any
}

/**
 * Represents the structure of a Flowise flow
 */
interface FlowData {
    nodes: FlowNode[]
    edges: any[]
    viewport: {
        x: number
        y: number
        zoom: number
    }
}

/**
 * Represents an extracted credential
 */
interface CredentialInfo {
    nodeId: string
    nodeType: string
    credentialId: string
}

/**
 * Represents an extracted model
 */
interface ModelInfo {
    nodeId: string
    nodeType: string
    modelName: string
}

/**
 * Result of extraction process
 */
interface ExtractionResult {
    credentials: CredentialInfo[]
    models: ModelInfo[]
}

/**
 * Extract credential IDs and model information from Flowise flow JSON
 * @param flowData - Flow data as JSON object or string
 * @returns Object containing credential IDs and models used
 */
function extractCredentialsAndModels(flowData: FlowData | string): ExtractionResult {
    // Parse the input if it's a string
    const flow: FlowData = typeof flowData === 'string' ? JSON.parse(flowData) : flowData

    // Initialize result object
    const result: ExtractionResult = {
        credentials: [],
        models: []
    }

    // Check if flow has nodes
    if (!flow.nodes || !Array.isArray(flow.nodes)) {
        return result
    }

    // Iterate through nodes
    flow.nodes.forEach((node) => {
        if (node.data) {
            // Extract credential ID if present
            if (node.data.credential) {
                result.credentials.push({
                    nodeId: node.id,
                    nodeType: node.data.type,
                    credentialId: node.data.credential
                })
            }

            // Extract model information if present
            if (node.data.inputs && node.data.inputs.modelName) {
                result.models.push({
                    nodeId: node.id,
                    nodeType: node.data.type,
                    modelName: node.data.inputs.modelName
                })
            }
        }
    })

    return result
}

export { extractCredentialsAndModels, FlowData, ExtractionResult, CredentialInfo, ModelInfo }
