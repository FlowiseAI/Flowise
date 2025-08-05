/**
 * Utility functions for detecting and managing missing credentials in flows
 */

/**
 * Extract required credentials from flow data and identify missing ones
 * @param {string|object} flowData - Flow data as JSON string or object
 * @returns {any[]} Array of missing credentials
 */
export const extractMissingCredentials = (flowData: string | any) => {
    try {
        // Parse flow data if it's a string
        const flow = typeof flowData === 'string' ? JSON.parse(flowData) : flowData

        if (!flow.nodes || !Array.isArray(flow.nodes)) {
            return []
        }

        const missingCredentials: any[] = []
        const credentialTypes = new Set<string>()

        // Define commonly needed optional credentials that should be offered
        const importantOptionalCredentials = ['redisCacheApi', 'redisCacheUrlApi', 'upstashRedisApi', 'upstashRedisMemoryApi']

        // Iterate through all nodes
        flow.nodes.forEach((node: any, index: number) => {
            if (node.data && node.data.inputParams) {
                // Find credential input parameters (required OR important optional ones)
                const credentialParams = node.data.inputParams.filter((param: any) => {
                    if (param.type !== 'credential') return false

                    // Include required credentials
                    if (!param.optional) return true

                    // Include important optional credentials
                    if (
                        param.credentialNames &&
                        param.credentialNames.some((name: string) => importantOptionalCredentials.includes(name))
                    ) {
                        return true
                    }

                    return false
                })

                credentialParams.forEach((credentialParam: any) => {
                    // Check if credential is assigned
                    const hasCredential =
                        node.data.credential ||
                        (node.data.inputs && node.data.inputs[credentialParam.name]) ||
                        (node.data.inputs && node.data.inputs['FLOWISE_CREDENTIAL_ID'])

                    if (!hasCredential) {
                        // Extract credential names
                        const credentialNames = credentialParam.credentialNames || []

                        credentialNames.forEach((credentialName: string) => {
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

        return missingCredentials
    } catch (error) {
        console.error('Error in extractMissingCredentials:', error)
        return []
    }
}
