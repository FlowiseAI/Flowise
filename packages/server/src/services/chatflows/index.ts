import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { IChatFlow } from '../../Interface'
import { ChatFlow } from '../../database/entities/ChatFlow'

const getAllChatflows = async (): Promise<IChatFlow[]> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).find()
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.getAllChatflows - ${error}`)
    }
}

export default {
    getAllChatflows
}
