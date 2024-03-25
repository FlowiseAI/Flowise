import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Tool } from '../../database/entities/Tool'

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

export default {
    getAllTools,
    getToolById
}
