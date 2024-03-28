import { findAvailableConfigs } from '../../utils'
import { IReactFlowNode } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getAllNodeConfigs = async (requestBody: any) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const nodes = [{ data: requestBody }] as IReactFlowNode[]
        const dbResponse = findAvailableConfigs(nodes, flowXpresApp.nodesPool.componentCredentials)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: nodeConfigsService.getAllNodeConfigs - ${error}`)
    }
}

export default {
    getAllNodeConfigs
}
