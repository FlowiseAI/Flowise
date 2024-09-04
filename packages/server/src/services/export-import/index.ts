import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Tool } from '../../database/entities/Tool'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
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

const importAll = async (importData: { Tool: Partial<Tool>[]; ChatFlow: Partial<ChatFlow>[] }) => {
    try {
        const appServer = getRunningExpressApp()
        const queryRunner = appServer.AppDataSource.createQueryRunner()

        try {
            queryRunner.startTransaction()
            // step 1 - importTools
            if (importData.Tool.length > 0) await toolsService.importTools(importData.Tool)
            // step 2 - importChatflows
            if (importData.ChatFlow.length > 0) await chatflowService.importChatflows(importData.ChatFlow)
            queryRunner.commitTransaction()
        } catch (error) {
            queryRunner.rollbackTransaction()
            throw error
        } finally {
            queryRunner.release()
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.importAll - ${getErrorMessage(error)}`
        )
    }
}

export default {
    exportAll,
    importAll
}
