import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Tool } from '../../database/entities/Tool'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import chatflowService from '../chatflows'
import toolsService from '../tools'

const FileDefaultName = 'AllData.json'

const exportAll = async (): Promise<{ FileDefaultName: string; Tool: Tool[]; ChatFlow: ChatFlow[] }> => {
    try {
        // step 1 - get all tool
        const allTool: Tool[] = await toolsService.getAllTools()

        // step 2 - get all ChatFlow and MultiAgent
        const allChatflow: ChatFlow[] = await chatflowService.getAllChatflows('ALL')

        return { FileDefaultName, Tool: allTool, ChatFlow: allChatflow }
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
