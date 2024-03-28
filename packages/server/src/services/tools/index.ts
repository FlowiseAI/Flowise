import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Tool } from '../../database/entities/Tool'
import { getAppVersion } from '../../utils'

const creatTool = async (requestBody: any): Promise<any> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const newTool = new Tool()
        Object.assign(newTool, requestBody)
        const tool = await flowXpresApp.AppDataSource.getRepository(Tool).create(newTool)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Tool).save(tool)
        await flowXpresApp.telemetry.sendTelemetry('tool_created', {
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
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Tool).delete({
            id: toolId
        })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.deleteTool - ${error}`)
    }
}

const getAllTools = async (): Promise<any> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Tool).find()
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.getAllTools - ${error}`)
    }
}

const getToolById = async (toolId: string): Promise<any> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Tool).findOneBy({
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
        const flowXpresApp = getRunningExpressApp()
        const tool = await flowXpresApp.AppDataSource.getRepository(Tool).findOneBy({
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
        await flowXpresApp.AppDataSource.getRepository(Tool).merge(tool, updateTool)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Tool).save(tool)
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
