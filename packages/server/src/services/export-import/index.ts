import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Tool } from '../../database/entities/Tool'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const exportAll = async (): Promise<{ Tool: Tool[]; ChatFlow: ChatFlow[]; MultiAgent: ChatFlow[] }> => {
    try {
        const MULTIAGENT = 'MULTIAGENT'
        const appServer = getRunningExpressApp()
        // step 1 - get all tool
        const allTool = await appServer.AppDataSource.getRepository(Tool).find()

        // step 2 - get all chatflow
        const chatFlows = await appServer.AppDataSource.getRepository(ChatFlow).find()
        const allChatflow = chatFlows.filter((chatflow) => chatflow.type != MULTIAGENT)

        // step 3 - get all multiAgent
        const allMultiAgent = chatFlows.filter((chatflow) => chatflow.type === MULTIAGENT)

        return { Tool: allTool, ChatFlow: allChatflow, MultiAgent: allMultiAgent }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.exportAll - ${getErrorMessage(error)}`
        )
    }
}

export default {
    exportAll
}
