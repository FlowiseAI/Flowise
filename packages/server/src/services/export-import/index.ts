import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Tool } from '../../database/entities/Tool'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import chatflowService from '../chatflows'
import toolsService from '../tools'

const exportAll = async (): Promise<{ Tool: Tool[]; ChatFlow: ChatFlow[]; MultiAgent: ChatFlow[] }> => {
    try {
        // step 1 - get all tool
        const allTool: Tool[] = await toolsService.getAllTools()

        // step 2 - get all chatFlow
        const allChatflow: ChatFlow[] = await chatflowService.getAllChatflows()

        // step 3 - get all multiAgent
        const allMultiAgent: ChatFlow[] = await chatflowService.getAllChatflows('MULTIAGENT')

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
