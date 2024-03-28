import { ChatFlow } from '../database/entities/ChatFlow'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'

export const addChatflowsCount = async (keys: any) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        let tmpResult = keys
        if (typeof keys !== 'undefined' && keys.length > 0) {
            const updatedKeys: any[] = []
            //iterate through keys and get chatflows
            for (const key of keys) {
                const chatflows = await flowXpresApp.AppDataSource.getRepository(ChatFlow)
                    .createQueryBuilder('cf')
                    .where('cf.apikeyid = :apikeyid', { apikeyid: key.id })
                    .getMany()
                const linkedChatFlows: any[] = []
                chatflows.map((cf) => {
                    linkedChatFlows.push({
                        flowName: cf.name,
                        category: cf.category,
                        updatedDate: cf.updatedDate
                    })
                })
                key.chatFlows = linkedChatFlows
                updatedKeys.push(key)
            }
            tmpResult = updatedKeys
        }
        return tmpResult
    } catch (error) {
        throw new Error(`Error: addChatflowsCount - ${error}`)
    }
}
