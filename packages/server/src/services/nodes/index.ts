import { cloneDeep } from 'lodash'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

// Get all component nodes
const getAllNodes = async () => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = []
        for (const nodeName in flowXpresApp.nodesPool.componentNodes) {
            const clonedNode = cloneDeep(flowXpresApp.nodesPool.componentNodes[nodeName])
            dbResponse.push(clonedNode)
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: nodesService.getAllNodes - ${error}`)
    }
}

// Get specific component node via name
const getNodeByName = async (nodeName: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        if (Object.prototype.hasOwnProperty.call(flowXpresApp.nodesPool.componentNodes, nodeName)) {
            const dbResponse = flowXpresApp.nodesPool.componentNodes[nodeName]
            return dbResponse
        } else {
            throw new Error(`Node ${nodeName} not found`)
        }
    } catch (error) {
        throw new Error(`Error: nodesService.getAllNodes - ${error}`)
    }
}

export default {
    getAllNodes,
    getNodeByName
}
