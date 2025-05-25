import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { INodeParams } from 'flowise-components'
import { IReactFlowEdge, IReactFlowNode } from '../../Interface'

interface IValidationResult {
    id: string
    label: string
    name: string
    issues: string[]
}

const checkFlowValidation = async (flowId: string, workspaceId?: string): Promise<IValidationResult[]> => {
    try {
        const appServer = getRunningExpressApp()

        const componentNodes = appServer.nodesPool.componentNodes

        // Create query conditions with workspace filtering if provided
        const whereCondition: any = { id: flowId }
        if (workspaceId) whereCondition.workspaceId = workspaceId

        const flow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: whereCondition
        })

        if (!flow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: validationService.checkFlowValidation - flow not found!`)
        }

        const flowData = JSON.parse(flow.flowData)
        const nodes = flowData.nodes
        const edges = flowData.edges

        // Store validation results
        const validationResults = []

        // Create a map of connected nodes
        const connectedNodes = new Set<string>()
        edges.forEach((edge: IReactFlowEdge) => {
            connectedNodes.add(edge.source)
            connectedNodes.add(edge.target)
        })

        // Validate each node
        for (const node of nodes) {
            if (node.data.name === 'stickyNoteAgentflow') continue

            const nodeIssues = []

            // Check if node is connected
            if (!connectedNodes.has(node.id)) {
                nodeIssues.push('This node is not connected to anything')
            }

            // Validate input parameters
            if (node.data && node.data.inputParams && node.data.inputs) {
                for (const param of node.data.inputParams) {
                    // Skip validation if the parameter has show condition that doesn't match
                    if (param.show) {
                        let shouldShow = true
                        for (const [key, value] of Object.entries(param.show)) {
                            if (node.data.inputs[key] !== value) {
                                shouldShow = false
                                break
                            }
                        }
                        if (!shouldShow) continue
                    }

                    // Skip validation if the parameter has hide condition that matches
                    if (param.hide) {
                        let shouldHide = true
                        for (const [key, value] of Object.entries(param.hide)) {
                            if (node.data.inputs[key] !== value) {
                                shouldHide = false
                                break
                            }
                        }
                        if (shouldHide) continue
                    }

                    // Check if required parameter has a value
                    if (!param.optional) {
                        const inputValue = node.data.inputs[param.name]
                        if (inputValue === undefined || inputValue === null || inputValue === '') {
                            nodeIssues.push(`${param.label} is required`)
                        }
                    }

                    // Check array type parameters (even if the array itself is optional)
                    if (param.type === 'array' && Array.isArray(node.data.inputs[param.name])) {
                        const inputValue = node.data.inputs[param.name]

                        // Only validate non-empty arrays (if array is required but empty, it's caught above)
                        if (inputValue.length > 0) {
                            // Check each item in the array
                            inputValue.forEach((item: Record<string, any>, index: number) => {
                                if (param.array) {
                                    param.array.forEach((arrayParam: INodeParams) => {
                                        // Evaluate if this parameter should be shown based on current values
                                        // First check show conditions
                                        let shouldValidate = true

                                        if (arrayParam.show) {
                                            // Default to not showing unless conditions match
                                            shouldValidate = false

                                            // Each key in show is a condition that must be satisfied
                                            for (const [conditionKey, expectedValue] of Object.entries(arrayParam.show)) {
                                                const isIndexCondition = conditionKey.includes('$index')
                                                let actualValue

                                                if (isIndexCondition) {
                                                    // Replace $index with actual index and evaluate
                                                    const normalizedKey = conditionKey.replace(/conditions\[\$index\]\.(\w+)/, '$1')
                                                    actualValue = item[normalizedKey]
                                                } else {
                                                    // Direct property in the current item
                                                    actualValue = item[conditionKey]
                                                }

                                                // Check if condition is satisfied
                                                let conditionMet = false
                                                if (Array.isArray(expectedValue)) {
                                                    conditionMet = expectedValue.includes(actualValue)
                                                } else {
                                                    conditionMet = actualValue === expectedValue
                                                }

                                                if (conditionMet) {
                                                    shouldValidate = true
                                                    break // One matching condition is enough
                                                }
                                            }
                                        }

                                        // Then check hide conditions (they override show conditions)
                                        if (shouldValidate && arrayParam.hide) {
                                            for (const [conditionKey, expectedValue] of Object.entries(arrayParam.hide)) {
                                                const isIndexCondition = conditionKey.includes('$index')
                                                let actualValue

                                                if (isIndexCondition) {
                                                    // Replace $index with actual index and evaluate
                                                    const normalizedKey = conditionKey.replace(/conditions\[\$index\]\.(\w+)/, '$1')
                                                    actualValue = item[normalizedKey]
                                                } else {
                                                    // Direct property in the current item
                                                    actualValue = item[conditionKey]
                                                }

                                                // Check if hide condition is met
                                                let shouldHide = false
                                                if (Array.isArray(expectedValue)) {
                                                    shouldHide = expectedValue.includes(actualValue)
                                                } else {
                                                    shouldHide = actualValue === expectedValue
                                                }

                                                if (shouldHide) {
                                                    shouldValidate = false
                                                    break // One matching hide condition is enough to hide
                                                }
                                            }
                                        }

                                        // Only validate if field should be shown
                                        if (shouldValidate) {
                                            // Check if value is required and missing
                                            if (
                                                (arrayParam.optional === undefined || !arrayParam.optional) &&
                                                (item[arrayParam.name] === undefined ||
                                                    item[arrayParam.name] === null ||
                                                    item[arrayParam.name] === '' ||
                                                    item[arrayParam.name] === '<p></p>')
                                            ) {
                                                nodeIssues.push(`${param.label} item #${index + 1}: ${arrayParam.label} is required`)
                                            }
                                        }
                                    })
                                }
                            })
                        }
                    }

                    // Check for credential requirements
                    if (param.name === 'credential' && !param.optional) {
                        const credentialValue = node.data.inputs[param.name]
                        if (!credentialValue) {
                            nodeIssues.push(`Credential is required`)
                        }
                    }

                    // Check for nested config parameters
                    const configKey = `${param.name}Config`
                    if (node.data.inputs[configKey] && node.data.inputs[param.name]) {
                        const componentName = node.data.inputs[param.name]
                        const configValue = node.data.inputs[configKey]

                        // Check if the component exists in the componentNodes pool
                        if (componentNodes[componentName] && componentNodes[componentName].inputs) {
                            const componentInputParams = componentNodes[componentName].inputs

                            // Validate each required input parameter in the component
                            for (const componentParam of componentInputParams) {
                                // Skip validation if the parameter has show condition that doesn't match
                                if (componentParam.show) {
                                    let shouldShow = true
                                    for (const [key, value] of Object.entries(componentParam.show)) {
                                        if (configValue[key] !== value) {
                                            shouldShow = false
                                            break
                                        }
                                    }
                                    if (!shouldShow) continue
                                }

                                // Skip validation if the parameter has hide condition that matches
                                if (componentParam.hide) {
                                    let shouldHide = true
                                    for (const [key, value] of Object.entries(componentParam.hide)) {
                                        if (configValue[key] !== value) {
                                            shouldHide = false
                                            break
                                        }
                                    }
                                    if (shouldHide) continue
                                }

                                if (!componentParam.optional) {
                                    const nestedValue = configValue[componentParam.name]
                                    if (nestedValue === undefined || nestedValue === null || nestedValue === '') {
                                        nodeIssues.push(`${param.label} configuration: ${componentParam.label} is required`)
                                    }
                                }
                            }

                            // Check for credential requirement in the component
                            if (componentNodes[componentName].credential && !componentNodes[componentName].credential.optional) {
                                if (!configValue.FLOWISE_CREDENTIAL_ID && !configValue.credential) {
                                    nodeIssues.push(`${param.label} requires a credential`)
                                }
                            }
                        }
                    }
                }
            }

            // Add node to validation results if it has issues
            if (nodeIssues.length > 0) {
                validationResults.push({
                    id: node.id,
                    label: node.data.label,
                    name: node.data.name,
                    issues: nodeIssues
                })
            }
        }

        // Check for hanging edges
        for (const edge of edges) {
            const sourceExists = nodes.some((node: IReactFlowNode) => node.id === edge.source)
            const targetExists = nodes.some((node: IReactFlowEdge) => node.id === edge.target)

            if (!sourceExists || !targetExists) {
                // Find the existing node that is connected to this hanging edge
                if (!sourceExists && targetExists) {
                    // Target exists but source doesn't - add issue to target node
                    const targetNode = nodes.find((node: IReactFlowNode) => node.id === edge.target)
                    const targetNodeResult = validationResults.find((result) => result.id === edge.target)

                    if (targetNodeResult) {
                        // Add to existing validation result
                        targetNodeResult.issues.push(`Connected to non-existent source node ${edge.source}`)
                    } else {
                        // Create new validation result for this node
                        validationResults.push({
                            id: targetNode.id,
                            label: targetNode.data.label,
                            name: targetNode.data.name,
                            issues: [`Connected to non-existent source node ${edge.source}`]
                        })
                    }
                } else if (sourceExists && !targetExists) {
                    // Source exists but target doesn't - add issue to source node
                    const sourceNode = nodes.find((node: IReactFlowNode) => node.id === edge.source)
                    const sourceNodeResult = validationResults.find((result) => result.id === edge.source)

                    if (sourceNodeResult) {
                        // Add to existing validation result
                        sourceNodeResult.issues.push(`Connected to non-existent target node ${edge.target}`)
                    } else {
                        // Create new validation result for this node
                        validationResults.push({
                            id: sourceNode.id,
                            label: sourceNode.data.label,
                            name: sourceNode.data.name,
                            issues: [`Connected to non-existent target node ${edge.target}`]
                        })
                    }
                } else {
                    // Both source and target don't exist - create a generic edge issue
                    validationResults.push({
                        id: edge.id,
                        label: `Edge ${edge.id}`,
                        name: 'edge',
                        issues: ['Disconnected edge - both source and target nodes do not exist']
                    })
                }
            }
        }

        return validationResults
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: validationService.checkFlowValidation - ${getErrorMessage(error)}`
        )
    }
}

export default {
    checkFlowValidation
}
