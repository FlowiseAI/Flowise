import path from 'path'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { IChatFlow } from '../../Interface'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { getAppVersion, getTelemetryFlowObj, deleteFolderRecursive } from '../../utils'
import logger from '../../utils/logger'
import { getStoragePath } from 'flowise-components'

const deleteChatflow = async (chatflowId: string): Promise<any> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).delete({ id: chatflowId })
        try {
            // Delete all  uploads corresponding to this chatflow
            const directory = path.join(getStoragePath(), chatflowId)
            deleteFolderRecursive(directory)
        } catch (e) {
            logger.error(`[server]: Error deleting file storage for chatflow ${chatflowId}: ${e}`)
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.getAllChatflows - ${error}`)
    }
}

const getAllChatflows = async (): Promise<IChatFlow[]> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).find()
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.getAllChatflows - ${error}`)
    }
}

const getChatflowById = async (chatflowId: string): Promise<any> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (!dbResponse) {
            return {
                executionError: true,
                status: 404,
                msg: `Chatflow ${chatflowId} not found in the database!`
            }
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.getAllChatflows - ${error}`)
    }
}

const saveChatflow = async (newChatFlow: ChatFlow): Promise<any> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const newDbChatflow = await flowXpresApp.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).save(newDbChatflow)
        await flowXpresApp.telemetry.sendTelemetry('chatflow_created', {
            version: await getAppVersion(),
            chatflowId: dbResponse.id,
            flowGraph: getTelemetryFlowObj(JSON.parse(dbResponse.flowData)?.nodes, JSON.parse(dbResponse.flowData)?.edges)
        })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.saveChatflow - ${error}`)
    }
}

const updateChatflow = async (chatflow: ChatFlow, updateChatFlow: ChatFlow): Promise<any> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const newDbChatflow = await flowXpresApp.AppDataSource.getRepository(ChatFlow).merge(chatflow, updateChatFlow)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).save(newDbChatflow)
        // chatFlowPool is initialized only when a flow is opened
        // if the user attempts to rename/update category without opening any flow, chatFlowPool will be undefined
        if (flowXpresApp.chatflowPool) {
            // Update chatflowpool inSync to false, to build flow from scratch again because data has been changed
            flowXpresApp.chatflowPool.updateInSync(chatflow.id, false)
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.updateChatflow - ${error}`)
    }
}

export default {
    deleteChatflow,
    getAllChatflows,
    getChatflowById,
    saveChatflow,
    updateChatflow
}
