import { handleEscapeCharacters, ICommonObject, INodeOptionsValue } from 'flowise-components'
import { cloneDeep } from 'lodash'
import { INodeData } from '../../Interface'
import { databaseEntities } from '../../utils'
import logger from '../../utils/logger'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getAllNodes = async () => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse: [] = []
        for (const nodeName in flowXpresApp.nodesPool.componentNodes) {
            const clonedNode = cloneDeep(flowXpresApp.nodesPool.componentNodes[nodeName])
            //@ts-ignore
            dbResponse.push(clonedNode)
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: nodesService.getAllNodes - ${error}`)
    }
}

const getSingleNode = async (nodeName: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        if (Object.prototype.hasOwnProperty.call(flowXpresApp.nodesPool.componentNodes, nodeName)) {
            return flowXpresApp.nodesPool.componentNodes[nodeName]
        }
    } catch (error) {
        throw new Error(`Error: nodesService.getSingleNode - ${error}`)
    }
}

const getSingleNodeIcon = async (nodeName: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        if (Object.prototype.hasOwnProperty.call(flowXpresApp.nodesPool.componentNodes, nodeName)) {
            const nodeInstance = flowXpresApp.nodesPool.componentNodes[nodeName]
            if (nodeInstance.icon === undefined) {
                throw new Error(`Node ${nodeName} icon not found`)
            }
            if (nodeInstance.icon.endsWith('.svg') || nodeInstance.icon.endsWith('.png') || nodeInstance.icon.endsWith('.jpg')) {
                const filepath = nodeInstance.icon
                return filepath
            } else {
                throw new Error(`Node ${nodeName} icon is missing icon`)
            }
        } else {
            throw new Error(`Node ${nodeName} not found`)
        }
    } catch (error) {
        throw new Error(`Error: nodesService.getSingleNodeIcon - ${error}`)
    }
}

//@ts-ignore
const getSingleNodeAsyncOptions = async (requestBody, nodeName: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const nodeData: INodeData = requestBody
        if (Object.prototype.hasOwnProperty.call(flowXpresApp.nodesPool.componentNodes, nodeName)) {
            try {
                const nodeInstance = flowXpresApp.nodesPool.componentNodes[nodeName]
                const methodName = nodeData.loadMethod || ''

                const dbResponse: INodeOptionsValue[] = await nodeInstance.loadMethods![methodName]!.call(nodeInstance, nodeData, {
                    appDataSource: flowXpresApp.AppDataSource,
                    databaseEntities: databaseEntities
                })

                return dbResponse
            } catch (error) {
                return []
            }
        } else {
            return {
                status: 404,
                msg: `Node ${nodeName} not found`
            }
        }
    } catch (error) {
        throw new Error(`Error: nodesService.getSingleNodeAsyncOptions - ${error}`)
    }
}

//@ts-ignore
const executeCustomFunction = async (requestBody) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const nodeData = { inputs: requestBody }
        if (Object.prototype.hasOwnProperty.call(flowXpresApp.nodesPool.componentNodes, 'customFunction')) {
            try {
                const nodeInstanceFilePath = flowXpresApp.nodesPool.componentNodes['customFunction'].filePath as string
                const nodeModule = await import(nodeInstanceFilePath)
                const newNodeInstance = new nodeModule.nodeClass()
                const options: ICommonObject = {
                    appDataSource: flowXpresApp.AppDataSource,
                    databaseEntities,
                    logger
                }
                const returnData = await newNodeInstance.init(nodeData, '', options)
                const dbResponse = typeof returnData === 'string' ? handleEscapeCharacters(returnData, true) : returnData
                return dbResponse
            } catch (error) {
                return {
                    status: 500,
                    msg: `Error running custom function: ${error}`
                }
            }
        } else {
            return {
                status: 404,
                msg: `Node customFunction not found`
            }
        }
    } catch (error) {
        throw new Error(`Error: nodesService.executeCustomFunction - ${error}`)
    }
}

export default {
    executeCustomFunction,
    getAllNodes,
    getSingleNode,
    getSingleNodeIcon,
    getSingleNodeAsyncOptions
}
