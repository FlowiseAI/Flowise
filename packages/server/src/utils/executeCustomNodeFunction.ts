import { handleEscapeCharacters, ICommonObject } from 'flowise-components'
import { databaseEntities } from '.'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getErrorMessage } from '../errors/utils'
import { DataSource } from 'typeorm'
import { IComponentNodes } from '../Interface'

export const executeCustomNodeFunction = async ({
    appDataSource,
    componentNodes,
    data,
    workspaceId,
    orgId
}: {
    appDataSource: DataSource
    componentNodes: IComponentNodes
    data: any
    workspaceId?: string
    orgId?: string
}) => {
    try {
        const body = data
        const jsFunction = typeof body?.javascriptFunction === 'string' ? body.javascriptFunction : ''
        const matches = jsFunction.matchAll(/\$([a-zA-Z0-9_]+)/g)
        const matchesArray: RegExpMatchArray[] = Array.from(matches)
        const functionInputVariables = Object.fromEntries(matchesArray.map((g) => [g[1], undefined]))
        if (functionInputVariables && Object.keys(functionInputVariables).length) {
            for (const key in functionInputVariables) {
                if (key.includes('vars')) {
                    delete functionInputVariables[key]
                }
            }
        }
        const nodeData = { inputs: { functionInputVariables, ...body } }
        if (Object.prototype.hasOwnProperty.call(componentNodes, 'customFunction')) {
            try {
                const nodeInstanceFilePath = componentNodes['customFunction'].filePath as string
                const nodeModule = await import(nodeInstanceFilePath)
                const newNodeInstance = new nodeModule.nodeClass()

                const options: ICommonObject = {
                    appDataSource,
                    databaseEntities,
                    workspaceId,
                    orgId
                }

                const returnData = await newNodeInstance.init(nodeData, '', options)
                const dbResponse = typeof returnData === 'string' ? handleEscapeCharacters(returnData, true) : returnData

                return dbResponse
            } catch (error) {
                throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error running custom function: ${error}`)
            }
        } else {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node customFunction not found`)
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: nodesService.executeCustomFunction - ${getErrorMessage(error)}`
        )
    }
}
