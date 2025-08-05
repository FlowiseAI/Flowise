import { INodeParams } from '@flowise/components'
import { CredentialInfo } from 'types'

/**
 * Extract all credentials (assigned and unassigned) from flow data
 * @param {string|object} flowData - Flow data as JSON string or object
 * @returns {CredentialInfo[]} Array of all credentials with assignment status
 */
export const extractAllCredentials = (flowData: string | any): CredentialInfo[] => {
    try {
        // Parse flow data if it's a string
        const flow = typeof flowData === 'string' ? JSON.parse(flowData) : flowData

        if (!flow.nodes || !Array.isArray(flow.nodes)) {
            return []
        }

        const allCredentials: CredentialInfo[] = []
        const credentialTypes = new Set<string>()

        // Define commonly needed optional credentials that should be offered
        const importantOptionalCredentials = ['redisCacheApi', 'redisCacheUrlApi', 'upstashRedisApi', 'upstashRedisMemoryApi']

        // Iterate through all nodes
        flow.nodes.forEach((node: any) => {
            if (node.data && node.data.inputParams) {
                // Find credential input parameters (required OR important optional ones)
                const credentialParams = node.data.inputParams.filter((param: INodeParams) => {
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

                credentialParams.forEach((credentialParam: INodeParams) => {
                    // Check if credential is assigned
                    const hasCredential =
                        node.data.credential ||
                        (node.data.inputs && node.data.inputs[credentialParam.name]) ||
                        (node.data.inputs && node.data.inputs['FLOWISE_CREDENTIAL_ID'])

                    // Extract credential names
                    const credentialNames = credentialParam.credentialNames || []

                    credentialNames.forEach((credentialName: string) => {
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

        return allCredentials
    } catch (error) {
        console.error('Error in extractAllCredentials:', error)
        return []
    }
}
