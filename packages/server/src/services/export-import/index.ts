import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Tool } from '../../database/entities/Tool'
import { Variable } from '../../database/entities/Variable'
import { Assistant } from '../../database/entities/Assistant'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import chatflowService from '../chatflows'
import toolsService from '../tools'
import variableService from '../variables'
import assistantService from '../assistants'

type ExportInput = {
    tool: boolean
    chatflow: boolean
    agentflow: boolean
    variable: boolean
    assistant: boolean
}

type ExportData = {
    Tool: Tool[]
    ChatFlow: ChatFlow[]
    AgentFlow: ChatFlow[]
    Variable: Variable[]
    Assistant: Assistant[]
}

const convertExportInput = (body: any): ExportInput => {
    try {
        if (!body || typeof body !== 'object') throw new Error('Invalid ExportInput object in request body')
        if (body.tool && typeof body.tool !== 'boolean') throw new Error('Invalid tool property in ExportInput object')
        if (body.chatflow && typeof body.chatflow !== 'boolean') throw new Error('Invalid chatflow property in ExportInput object')
        if (body.agentflow && typeof body.agentflow !== 'boolean') throw new Error('Invalid agentflow property in ExportInput object')
        if (body.variable && typeof body.variable !== 'boolean') throw new Error('Invalid variable property in ExportInput object')
        if (body.assistant && typeof body.assistant !== 'boolean') throw new Error('Invalid assistant property in ExportInput object')
        return body as ExportInput
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.convertExportInput - ${getErrorMessage(error)}`
        )
    }
}

const FileDefaultName = 'ExportData.json'
const exportData = async (exportInput: ExportInput): Promise<{ FileDefaultName: string } & ExportData> => {
    try {
        // step 1 - get all Tool
        let allTool: Tool[] = []
        if (exportInput.tool === true) allTool = await toolsService.getAllTools()

        // step 2 - get all ChatFlow
        let allChatflow: ChatFlow[] = []
        if (exportInput.chatflow === true) allChatflow = await chatflowService.getAllChatflows('CHATFLOW')

        // step 3 - get all MultiAgent
        let allMultiAgent: ChatFlow[] = []
        if (exportInput.agentflow === true) allMultiAgent = await chatflowService.getAllChatflows('MULTIAGENT')

        let allVars: Variable[] = []
        if (exportInput.variable === true) allVars = await variableService.getAllVariables()

        let allAssistants: Assistant[] = []
        if (exportInput.assistant === true) allAssistants = await assistantService.getAllAssistants()

        return {
            FileDefaultName,
            Tool: allTool,
            ChatFlow: allChatflow,
            AgentFlow: allMultiAgent,
            Variable: allVars,
            Assistant: allAssistants
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.exportData - ${getErrorMessage(error)}`
        )
    }
}

const importData = async (importData: ExportData) => {
    try {
        const appServer = getRunningExpressApp()
        const queryRunner = appServer.AppDataSource.createQueryRunner()

        try {
            await queryRunner.startTransaction()

            if (importData.Tool.length > 0) await toolsService.importTools(importData.Tool, queryRunner)
            if (importData.ChatFlow.length > 0) await chatflowService.importChatflows(importData.ChatFlow, queryRunner)
            if (importData.AgentFlow.length > 0) await chatflowService.importChatflows(importData.AgentFlow, queryRunner)
            if (importData.Variable.length > 0) await variableService.importVariables(importData.Variable, queryRunner)
            if (importData.Assistant.length > 0) await assistantService.importAssistants(importData.Assistant, queryRunner)

            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (!queryRunner.isReleased) {
                await queryRunner.release()
            }
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
    importData
}
