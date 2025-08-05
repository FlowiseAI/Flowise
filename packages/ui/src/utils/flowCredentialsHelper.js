/**
 * Utility functions for detecting and managing missing credentials in flows
 */

/**
 * Extract required credentials from flow data and identify missing ones
 * @param {string|object} flowData - Flow data as JSON string or object
 * @returns {object} Object containing missing credentials info
 */
export const extractMissingCredentials = (flowData) => {
    try {
        // Parse flow data if it's a string
        const flow = typeof flowData === 'string' ? JSON.parse(flowData) : flowData

        if (!flow.nodes || !Array.isArray(flow.nodes)) {
            return { missingCredentials: [], hasCredentials: false }
        }

        const missingCredentials = []
        const credentialTypes = new Set()

        // Define commonly needed optional credentials that should be offered
        const importantOptionalCredentials = ['redisCacheApi', 'redisCacheUrlApi', 'upstashRedisApi', 'upstashRedisMemoryApi']

        // Iterate through all nodes
        flow.nodes.forEach((node, index) => {
            if (node.data && node.data.inputParams) {
                // Find credential input parameters (required OR important optional ones)
                const credentialParams = node.data.inputParams.filter((param) => {
                    if (param.type !== 'credential') return false

                    // Include required credentials
                    if (!param.optional) return true

                    // Include important optional credentials
                    if (param.credentialNames && param.credentialNames.some((name) => importantOptionalCredentials.includes(name))) {
                        return true
                    }

                    return false
                })

                credentialParams.forEach((credentialParam) => {
                    // Check if credential is assigned
                    const hasCredential =
                        node.data.credential ||
                        (node.data.inputs && node.data.inputs[credentialParam.name]) ||
                        (node.data.inputs && node.data.inputs['FLOWISE_CREDENTIAL_ID'])

                    if (!hasCredential) {
                        // Extract credential names
                        const credentialNames = credentialParam.credentialNames || []

                        credentialNames.forEach((credentialName) => {
                            credentialTypes.add(credentialName)

                            const missingCred = {
                                nodeId: node.id,
                                nodeName: node.data.name || 'Unknown Node',
                                credentialType: credentialName,
                                parameterName: credentialParam.name,
                                label: credentialParam.label || credentialParam.name,
                                isOptional: !!credentialParam.optional
                            }

                            missingCredentials.push(missingCred)
                        })
                    }
                })
            }
        })

        const result = {
            missingCredentials,
            hasCredentials: credentialTypes.size > 0
        }

        return result
    } catch (error) {
        console.error('Error in extractMissingCredentials:', error)
        return { missingCredentials: [], hasCredentials: false }
    }
}

/**
 * Extract all credentials (assigned and unassigned) from flow data for QuickSetup mode
 * @param {string|object} flowData - Flow data as JSON string or object
 * @returns {object} Object containing all credentials info
 */
export const extractAllCredentials = (flowData) => {
    try {
        // Parse flow data if it's a string
        const flow = typeof flowData === 'string' ? JSON.parse(flowData) : flowData

        if (!flow.nodes || !Array.isArray(flow.nodes)) {
            return { allCredentials: [], hasCredentials: false }
        }

        const allCredentials = []
        const credentialTypes = new Set()

        // Define commonly needed optional credentials that should be offered
        const importantOptionalCredentials = ['redisCacheApi', 'redisCacheUrlApi', 'upstashRedisApi', 'upstashRedisMemoryApi']

        // Iterate through all nodes
        flow.nodes.forEach((node, index) => {
            if (node.data && node.data.inputParams) {
                // Find credential input parameters (required OR important optional ones)
                const credentialParams = node.data.inputParams.filter((param) => {
                    if (param.type !== 'credential') return false

                    // Include required credentials
                    if (!param.optional) return true

                    // Include important optional credentials
                    if (param.credentialNames && param.credentialNames.some((name) => importantOptionalCredentials.includes(name))) {
                        return true
                    }

                    return false
                })

                credentialParams.forEach((credentialParam) => {
                    // Check if credential is assigned
                    const hasCredential =
                        node.data.credential ||
                        (node.data.inputs && node.data.inputs[credentialParam.name]) ||
                        (node.data.inputs && node.data.inputs['FLOWISE_CREDENTIAL_ID'])

                    // Extract credential names
                    const credentialNames = credentialParam.credentialNames || []

                    credentialNames.forEach((credentialName) => {
                        credentialTypes.add(credentialName)

                        const credInfo = {
                            nodeId: node.id,
                            nodeName: node.data.name || 'Unknown Node',
                            credentialType: credentialName,
                            parameterName: credentialParam.name,
                            label: credentialParam.label || credentialParam.name,
                            isOptional: !!credentialParam.optional,
                            isAssigned: !!hasCredential,
                            assignedCredentialId: hasCredential || null
                        }

                        allCredentials.push(credInfo)
                    })
                })
            }
        })

        const result = {
            allCredentials,
            hasCredentials: credentialTypes.size > 0
        }

        return result
    } catch (error) {
        console.error('Error in extractAllCredentials:', error)
        return { allCredentials: [], hasCredentials: false }
    }
}

/**
 * Group missing credentials by credential type for better organization
 * @param {array} missingCredentials - Array of missing credential objects
 * @returns {object} Grouped credentials by type
 */
export const groupCredentialsByType = (missingCredentials) => {
    const grouped = {}

    // Define credential groups that should be treated as one logical choice
    const credentialGroups = {
        redis: ['redisCacheApi', 'redisCacheUrlApi'],
        upstashRedis: ['upstashRedisApi', 'upstashRedisMemoryApi']
    }

    // Create reverse mapping from credential type to group
    const typeToGroup = {}
    Object.entries(credentialGroups).forEach(([groupName, types]) => {
        types.forEach((type) => {
            typeToGroup[type] = groupName
        })
    })

    missingCredentials.forEach((credInfo) => {
        const credentialType = credInfo.credentialType

        if (credentialType) {
            // Check if this credential type belongs to a group
            const groupKey = typeToGroup[credentialType] || credentialType
            const displayName = groupKey === 'redis' ? 'Redis' : groupKey === 'upstashRedis' ? 'Upstash Redis' : credentialType

            if (!grouped[groupKey]) {
                grouped[groupKey] = {
                    credentialName: groupKey,
                    label: displayName,
                    credentialTypes: groupKey === credentialType ? [credentialType] : credentialGroups[groupKey] || [credentialType],
                    nodes: []
                }
            }

            // Avoid duplicate node entries for the same logical group
            const existingNode = grouped[groupKey].nodes.find(
                (node) => node.nodeId === credInfo.nodeId && node.parameterName === credInfo.parameterName
            )

            if (!existingNode) {
                grouped[groupKey].nodes.push({
                    nodeId: credInfo.nodeId,
                    nodeName: credInfo.nodeName,
                    parameterName: credInfo.parameterName
                })
            }
        }
    })

    return grouped
}

/**
 * Group all credentials (assigned and unassigned) by credential type for QuickSetup mode
 * @param {array} allCredentials - Array of all credential objects
 * @returns {object} Grouped credentials by type
 */
export const groupAllCredentialsByType = (allCredentials) => {
    const grouped = {}

    // Define credential groups that should be treated as one logical choice
    const credentialGroups = {
        redis: ['redisCacheApi', 'redisCacheUrlApi'],
        upstashRedis: ['upstashRedisApi', 'upstashRedisMemoryApi']
    }

    // Create reverse mapping from credential type to group
    const typeToGroup = {}
    Object.entries(credentialGroups).forEach(([groupName, types]) => {
        types.forEach((type) => {
            typeToGroup[type] = groupName
        })
    })

    allCredentials.forEach((credInfo) => {
        const credentialType = credInfo.credentialType

        if (credentialType) {
            // Check if this credential type belongs to a group
            const groupKey = typeToGroup[credentialType] || credentialType
            const displayName = groupKey === 'redis' ? 'Redis' : groupKey === 'upstashRedis' ? 'Upstash Redis' : credentialType

            if (!grouped[groupKey]) {
                grouped[groupKey] = {
                    credentialName: groupKey,
                    label: displayName,
                    credentialTypes: groupKey === credentialType ? [credentialType] : credentialGroups[groupKey] || [credentialType],
                    nodes: [],
                    isAssigned: false,
                    assignedCredentialId: null
                }
            }

            // Check if any node in this group has assigned credentials
            if (credInfo.isAssigned) {
                grouped[groupKey].isAssigned = true
                grouped[groupKey].assignedCredentialId = credInfo.assignedCredentialId
            }

            // Avoid duplicate node entries for the same logical group
            const existingNode = grouped[groupKey].nodes.find(
                (node) => node.nodeId === credInfo.nodeId && node.parameterName === credInfo.parameterName
            )

            if (!existingNode) {
                grouped[groupKey].nodes.push({
                    nodeId: credInfo.nodeId,
                    nodeName: credInfo.nodeName,
                    parameterName: credInfo.parameterName,
                    isAssigned: credInfo.isAssigned,
                    assignedCredentialId: credInfo.assignedCredentialId
                })
            }
        }
    })

    return grouped
}

/**
 * Update flow data with new credential assignments
 * @param {string|object} flowData - Original flow data
 * @param {object} credentialAssignments - Object mapping nodeId to credentialId
 * @returns {object} Updated flow data
 */
export const updateFlowDataWithCredentials = (flowData, credentialAssignments) => {
    try {
        const flow = typeof flowData === 'string' ? JSON.parse(flowData) : { ...flowData }

        if (!flow.nodes || !Array.isArray(flow.nodes)) {
            return flow
        }

        // Update nodes with credential assignments
        flow.nodes = flow.nodes.map((node) => {
            if (credentialAssignments[node.id]) {
                const updatedNode = { ...node }
                updatedNode.data = { ...node.data }

                // Set the credential
                updatedNode.data.credential = credentialAssignments[node.id]

                // Also set in inputs for compatibility
                if (!updatedNode.data.inputs) {
                    updatedNode.data.inputs = {}
                }
                updatedNode.data.inputs['FLOWISE_CREDENTIAL_ID'] = credentialAssignments[node.id]

                return updatedNode
            }
            return node
        })

        return flow
    } catch (error) {
        console.error('Error updating flow data with credentials:', error)
        return flowData
    }
}

/**
 * Check if a credential assignment is valid for a node
 * @param {object} node - Flow node
 * @param {string} credentialId - Credential ID to check
 * @param {array} availableCredentials - Available credentials for this type
 * @returns {boolean} Whether the assignment is valid
 */
export const isValidCredentialAssignment = (node, credentialId, availableCredentials) => {
    if (!credentialId || !availableCredentials) return false

    return availableCredentials.some((cred) => cred.id === credentialId)
}