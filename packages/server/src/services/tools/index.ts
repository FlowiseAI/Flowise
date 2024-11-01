import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Tool, ToolVisibility } from '../../database/entities/Tool'
import { getAppVersion } from '../../utils'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { IUser } from '../../Interface'
import { IsNull, Like } from 'typeorm'

const createTool = async (requestBody: any, user: IUser): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const newTool = new Tool()
        Object.assign(newTool, requestBody)
        newTool.userId = user.id
        newTool.organizationId = user.organizationId
        const tool = await appServer.AppDataSource.getRepository(Tool).create(newTool)
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).save(tool)
        await appServer.telemetry.sendTelemetry('tool_created', {
            version: await getAppVersion(),
            toolId: dbResponse.id,
            toolName: dbResponse.name
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.createTool - ${getErrorMessage(error)}`)
    }
}

const deleteTool = async (toolId: string, user: IUser): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).delete({
            id: toolId,
            userId: user.id
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.deleteTool - ${getErrorMessage(error)}`)
    }
}

const getAllTools = async (user: IUser): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const toolRepo = appServer.AppDataSource.getRepository(Tool)
        const isAdmin = user?.roles?.includes('Admin')

        const tools = await toolRepo.find({
            // @ts-ignore
            where: isAdmin
                ? [{ organizationId: user.organizationId }, { userId: IsNull() }]
                : [
                      { userId: user.id },
                      { userId: IsNull() },
                      {
                          organizationId: user.organizationId,
                          // @ts-ignore
                          visibility: Like(`%${ToolVisibility.ORGANIZATION}%`)
                      }
                  ]
        })

        return tools.map((tool) => ({
            ...tool,
            isOwner: tool.userId === user.id
        }))
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.getAllTools - ${getErrorMessage(error)}`)
    }
}

const getToolById = async (toolId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).findOneBy({
            id: toolId
        })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Tool ${toolId} not found`)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.getToolById - ${getErrorMessage(error)}`)
    }
}

const updateTool = async (toolId: string, toolBody: any, user: IUser): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const tool = await appServer.AppDataSource.getRepository(Tool).findOneBy({
            id: toolId
        })
        if (!tool) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Tool ${toolId} not found`)
        }
        const updateTool = new Tool()
        Object.assign(updateTool, toolBody)
        updateTool.organizationId = user.organizationId
        await appServer.AppDataSource.getRepository(Tool).merge(tool, updateTool)
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).save(tool)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.updateTool - ${getErrorMessage(error)}`)
    }
}

export default {
    createTool,
    deleteTool,
    getAllTools,
    getToolById,
    updateTool
}
