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

export default {
    getAllTools
}
