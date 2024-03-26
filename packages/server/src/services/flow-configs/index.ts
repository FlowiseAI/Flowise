import { ChatFlow } from '../../database/entities/ChatFlow'
import { findAvailableConfigs } from '../../utils'
import { IReactFlowObject } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getSingleFlowConfig = async (chatflowId: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const chatflow = await flowXpresApp.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (!chatflow) {
            return {
                executionError: true,
                status: 404,
                msg: `Chatflow ${chatflowId} not found in the database!`
            }
        }
        const flowData = chatflow.flowData
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const nodes = parsedFlowData.nodes
        const dbResponse = findAvailableConfigs(nodes, flowXpresApp.nodesPool.componentCredentials)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: flowConfigService.getSingleFlowConfig - ${error}`)
    }
}

export default {
    getSingleFlowConfig
}
