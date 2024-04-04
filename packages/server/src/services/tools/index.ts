import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Tool } from '../../database/entities/Tool'
import { getAppVersion } from '../../utils'

const creatTool = async (requestBody: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const newTool = new Tool()
        Object.assign(newTool, requestBody)
        const tool = await appServer.AppDataSource.getRepository(Tool).create(newTool)
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).save(tool)
        await appServer.telemetry.sendTelemetry('tool_created', {
            version: await getAppVersion(),
            toolId: dbResponse.id,
            toolName: dbResponse.name
        })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.creatTool - ${error}`)
    }
}

const deleteTool = async (toolId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).delete({
            id: toolId
        })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.deleteTool - ${error}`)
    }
}

const getAllTools = async (): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).find()
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.getAllTools - ${error}`)
    }
}

const getToolById = async (toolId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).findOneBy({
            id: toolId
        })
        if (!dbResponse) {
            return {
                executionError: true,
                status: 404,
                msg: `Tool ${toolId} not found`
            }
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.getToolById - ${error}`)
    }
}

const updateTool = async (toolId: string, toolBody: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const tool = await appServer.AppDataSource.getRepository(Tool).findOneBy({
            id: toolId
        })
        if (!tool) {
            return {
                executionError: true,
                status: 404,
                msg: `Tool ${toolId} not found`
            }
        }
        const updateTool = new Tool()
        Object.assign(updateTool, toolBody)
        await appServer.AppDataSource.getRepository(Tool).merge(tool, updateTool)
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).save(tool)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.getToolById - ${error}`)
    }
}

export default {
    creatTool,
    deleteTool,
    getAllTools,
    getToolById,
    updateTool
}
