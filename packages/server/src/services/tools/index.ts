import { Tool } from '../../database/entities/Tool'
import telemetryService from '../../services/telemetry'
import { getAppVersion } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

//@ts-ignore
const createTool = async (requestBody) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const newTool = new Tool()
        Object.assign(newTool, requestBody)
        const tool = await flowXpresApp.AppDataSource.getRepository(Tool).create(newTool)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Tool).save(tool)
        await telemetryService.createEvent({
            name: `tool_created`,
            data: {
                version: await getAppVersion(),
                toolId: dbResponse.id,
                toolName: dbResponse.name
            }
        })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.createTool - ${error}`)
    }
}

const deleteTool = async (toolId: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Tool).delete({ id: toolId })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.deleteTool - ${error}`)
    }
}

const getAllTools = async () => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Tool).find()
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.getAllTools - ${error}`)
    }
}

const getSingleTool = async (toolId: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Tool).findOneBy({
            id: toolId
        })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.getSingleTool - ${error}`)
    }
}

//@ts-ignore
const updateTool = async (toolId: string, requestBody) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const tool = await flowXpresApp.AppDataSource.getRepository(Tool).findOneBy({
            id: toolId
        })
        if (!tool) {
            return {
                executionError: true,
                status: 404,
                msg: `Tool ${toolId} not found in the database!`
            }
        }
        const updateTool = new Tool()
        Object.assign(updateTool, requestBody)
        await flowXpresApp.AppDataSource.getRepository(Tool).merge(tool, updateTool)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Tool).save(tool)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: toolsService.updateTool - ${error}`)
    }
}

export default {
    createTool,
    deleteTool,
    getAllTools,
    getSingleTool,
    updateTool
}
