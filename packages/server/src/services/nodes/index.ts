import { cloneDeep } from 'lodash'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { INodeData } from '../../Interface'
import { INodeOptionsValue, ICommonObject, handleEscapeCharacters } from 'flowise-components'
import { databaseEntities } from '../../utils'
import logger from '../../utils/logger'
import { InternalServerError } from '../../errors/internalServerError'
import { StatusCodes } from 'http-status-codes'

// Get all component nodes
const getAllNodes = async () => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = []
        for (const nodeName in appServer.nodesPool.componentNodes) {
            const clonedNode = cloneDeep(appServer.nodesPool.componentNodes[nodeName])
            dbResponse.push(clonedNode)
        }
        return dbResponse
    } catch (error) {
        throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: nodesService.getAllNodes - ${error}`)
    }
}

// Get specific component node via name
const getNodeByName = async (nodeName: string) => {
    try {
        const appServer = getRunningExpressApp()
        if (Object.prototype.hasOwnProperty.call(appServer.nodesPool.componentNodes, nodeName)) {
            const dbResponse = appServer.nodesPool.componentNodes[nodeName]
            return dbResponse
        } else {
            throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Node ${nodeName} not found`)
        }
    } catch (error) {
        throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: nodesService.getAllNodes - ${error}`)
    }
}

// Returns specific component node icon via name
const getSingleNodeIcon = async (nodeName: string) => {
    try {
        const appServer = getRunningExpressApp()
        if (Object.prototype.hasOwnProperty.call(appServer.nodesPool.componentNodes, nodeName)) {
            const nodeInstance = appServer.nodesPool.componentNodes[nodeName]
            if (nodeInstance.icon === undefined) {
                throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Node ${nodeName} icon not found`)
            }

            if (nodeInstance.icon.endsWith('.svg') || nodeInstance.icon.endsWith('.png') || nodeInstance.icon.endsWith('.jpg')) {
                const filepath = nodeInstance.icon
                return filepath
            } else {
                throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Node ${nodeName} icon is missing icon`)
            }
        } else {
            throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Node ${nodeName} not found`)
        }
    } catch (error) {
        throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: nodesService.getSingleNodeIcon - ${error}`)
    }
}

const getSingleNodeAsyncOptions = async (nodeName: string, requestBody: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const nodeData: INodeData = requestBody
        if (Object.prototype.hasOwnProperty.call(appServer.nodesPool.componentNodes, nodeName)) {
            try {
                const nodeInstance = appServer.nodesPool.componentNodes[nodeName]
                const methodName = nodeData.loadMethod || ''

                const dbResponse: INodeOptionsValue[] = await nodeInstance.loadMethods![methodName]!.call(nodeInstance, nodeData, {
                    appDataSource: appServer.AppDataSource,
                    databaseEntities: databaseEntities
                })

                return dbResponse
            } catch (error) {
                return []
            }
        } else {
            throw new InternalServerError(StatusCodes.NOT_FOUND, `Node ${nodeName} not found`)
        }
    } catch (error) {
        throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: nodesService.getSingleNodeAsyncOptions - ${error}`)
    }
}

// execute custom function node
const executeCustomFunction = async (requestBody: any) => {
    try {
        const appServer = getRunningExpressApp()
        const body = requestBody
        const functionInputVariables = Object.fromEntries(
            [...(body?.javascriptFunction ?? '').matchAll(/\$([a-zA-Z0-9_]+)/g)].map((g) => [g[1], undefined])
        )
        const nodeData = { inputs: { functionInputVariables, ...body } }
        if (Object.prototype.hasOwnProperty.call(appServer.nodesPool.componentNodes, 'customFunction')) {
            try {
                const nodeInstanceFilePath = appServer.nodesPool.componentNodes['customFunction'].filePath as string
                const nodeModule = await import(nodeInstanceFilePath)
                const newNodeInstance = new nodeModule.nodeClass()

                const options: ICommonObject = {
                    appDataSource: appServer.AppDataSource,
                    databaseEntities,
                    logger
                }

                const returnData = await newNodeInstance.init(nodeData, '', options)
                const dbResponse = typeof returnData === 'string' ? handleEscapeCharacters(returnData, true) : returnData

                return dbResponse
            } catch (error) {
                throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Error running custom function: ${error}`)
            }
        } else {
            throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Node customFunction not found`)
        }
    } catch (error) {
        throw new InternalServerError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: nodesService.executeCustomFunction - ${error}`)
    }
}

export default {
    getAllNodes,
    getNodeByName,
    getSingleNodeIcon,
    getSingleNodeAsyncOptions,
    executeCustomFunction
}
