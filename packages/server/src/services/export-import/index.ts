import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Tool } from '../../database/entities/Tool'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import chatflowService from '../chatflows'
import toolsService from '../tools'

type ExportInput = { tool: boolean; chatflow: boolean; multiagent: boolean }

const convertExportInput = (body: any): ExportInput => {
    try {
        if (typeof body.tool !== 'boolean' || typeof body.chatflow !== 'boolean' || typeof body.multiagent !== 'boolean')
            throw new Error('Invalid ExportInput object in request body')
        return body as ExportInput
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.convertExportInput - ${getErrorMessage(error)}`
        )
    }
}

const FileDefaultName = 'ExportData.json'
const exportData = async (exportInput: ExportInput): Promise<{ FileDefaultName: string; Tool: Tool[]; ChatFlow: ChatFlow[] }> => {
    try {
        // step 1 - get all tool
        let allTool: Tool[] = []
        if (exportInput.tool === true) allTool = await toolsService.getAllTools()

        // step 2 - get all ChatFlow
        let allChatflow: ChatFlow[] = []
        if (exportInput.chatflow === true) allChatflow = await chatflowService.getAllChatflows('CHATFLOW')

        // step 3 - get all MultiAgent
        let allMultiAgent: ChatFlow[] = []
        if (exportInput.multiagent === true) allMultiAgent = await chatflowService.getAllChatflows('MULTIAGENT')

        return { FileDefaultName, Tool: allTool, ChatFlow: [...allChatflow, ...allMultiAgent] }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.exportData - ${getErrorMessage(error)}`
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
    convertExportInput,
    exportData,
    importAll
}
