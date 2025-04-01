import { StatusCodes } from 'http-status-codes'
import { Assistant } from '../../database/entities/Assistant'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { CustomTemplate } from '../../database/entities/CustomTemplate'
import { DocumentStore } from '../../database/entities/DocumentStore'
import { DocumentStoreFileChunk } from '../../database/entities/DocumentStoreFileChunk'
import { Tool } from '../../database/entities/Tool'
import { Variable } from '../../database/entities/Variable'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import assistantService from '../assistants'
import chatMessagesService from '../chat-messages'
import chatflowService from '../chatflows'
import documenStoreService from '../documentstore'
import marketplacesService from '../marketplaces'
import toolsService from '../tools'
import variableService from '../variables'

type ExportInput = {
    agentflow: boolean
    assistant: boolean
    chatflow: boolean
    chat_message: boolean
    chat_feedback: boolean
    custom_template: boolean
    document_store: boolean
    tool: boolean
    variable: boolean
}

type ExportData = {
    AgentFlow: ChatFlow[]
    AssistantFlow: ChatFlow[]
    Assistant: Assistant[]
    ChatFlow: ChatFlow[]
    ChatMessage: ChatMessage[]
    ChatMessageFeedback: ChatMessageFeedback[]
    CustomTemplate: CustomTemplate[]
    DocumentStore: DocumentStore[]
    DocumentStoreFileChunk: DocumentStoreFileChunk[]
    Tool: Tool[]
    Variable: Variable[]
}

const convertExportInput = (body: any): ExportInput => {
    try {
        if (!body || typeof body !== 'object') throw new Error('Invalid ExportInput object in request body')
        if (body.agentflow && typeof body.agentflow !== 'boolean') throw new Error('Invalid agentflow property in ExportInput object')
        if (body.assistant && typeof body.assistant !== 'boolean') throw new Error('Invalid assistant property in ExportInput object')
        if (body.chatflow && typeof body.chatflow !== 'boolean') throw new Error('Invalid chatflow property in ExportInput object')
        if (body.chat_message && typeof body.chat_message !== 'boolean')
            throw new Error('Invalid chat_message property in ExportInput object')
        if (body.chat_feedback && typeof body.chat_feedback !== 'boolean')
            throw new Error('Invalid chat_feedback property in ExportInput object')
        if (body.custom_template && typeof body.custom_template !== 'boolean')
            throw new Error('Invalid custom_template property in ExportInput object')
        if (body.document_store && typeof body.document_store !== 'boolean')
            throw new Error('Invalid document_store property in ExportInput object')
        if (body.tool && typeof body.tool !== 'boolean') throw new Error('Invalid tool property in ExportInput object')
        if (body.variable && typeof body.variable !== 'boolean') throw new Error('Invalid variable property in ExportInput object')
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
        let AgentFlow: ChatFlow[] = exportInput.agentflow === true ? await chatflowService.getAllChatflows('MULTIAGENT') : []

        let Assistant: Assistant[] = exportInput.assistant === true ? await assistantService.getAllAssistants() : []

        let AssistantFlow: ChatFlow[] = exportInput.assistant === true ? await chatflowService.getAllChatflows('ASSISTANT') : []

        let ChatFlow: ChatFlow[] = exportInput.chatflow === true ? await chatflowService.getAllChatflows('CHATFLOW') : []

        let ChatMessage: ChatMessage[] = exportInput.chat_message === true ? await chatMessagesService.getAllMessages() : []

        let ChatMessageFeedback: ChatMessageFeedback[] =
            exportInput.chat_feedback === true ? await chatMessagesService.getAllMessagesFeedback() : []

        let CustomTemplate: CustomTemplate[] = exportInput.custom_template === true ? await marketplacesService.getAllCustomTemplates() : []
        CustomTemplate = CustomTemplate.map((customTemplate) => ({ ...customTemplate, usecases: JSON.stringify(customTemplate.usecases) }))

        let DocumentStore: DocumentStore[] = exportInput.document_store === true ? await documenStoreService.getAllDocumentStores() : []

        let DocumentStoreFileChunk: DocumentStoreFileChunk[] =
            exportInput.document_store === true ? await documenStoreService.getAllDocumentFileChunks() : []

        let Tool: Tool[] = exportInput.tool === true ? await toolsService.getAllTools() : []

        let Variable: Variable[] = exportInput.variable === true ? await variableService.getAllVariables() : []

        return {
            FileDefaultName,
            AgentFlow,
            AssistantFlow,
            Assistant,
            ChatFlow,
            ChatMessage,
            ChatMessageFeedback,
            CustomTemplate,
            DocumentStore,
            DocumentStoreFileChunk,
            Tool,
            Variable
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.exportData - ${getErrorMessage(error)}`
        )
    }
}

const importData = async (importData: ExportData) => {
    let queryRunner
    try {
        queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()

        try {
            await queryRunner.startTransaction()

            if (importData.AgentFlow.length > 0) await chatflowService.importChatflows(importData.AgentFlow, queryRunner)
            if (importData.AssistantFlow.length > 0) await chatflowService.importChatflows(importData.AssistantFlow, queryRunner)
            if (importData.Assistant.length > 0) await assistantService.importAssistants(importData.Assistant, queryRunner)
            if (importData.ChatFlow.length > 0) await chatflowService.importChatflows(importData.ChatFlow, queryRunner)
            if (importData.ChatMessage.length > 0) await queryRunner.manager.save(ChatMessage, importData.ChatMessage)
            if (importData.ChatMessageFeedback.length > 0)
                await queryRunner.manager.save(ChatMessageFeedback, importData.ChatMessageFeedback)
            if (importData.CustomTemplate.length > 0) await queryRunner.manager.save(CustomTemplate, importData.CustomTemplate)
            if (importData.DocumentStore.length > 0) await queryRunner.manager.save(DocumentStore, importData.DocumentStore)
            if (importData.DocumentStoreFileChunk.length > 0)
                await queryRunner.manager.save(DocumentStoreFileChunk, importData.DocumentStoreFileChunk)
            if (importData.Tool.length > 0) await toolsService.importTools(importData.Tool, queryRunner)
            if (importData.Variable.length > 0) await variableService.importVariables(importData.Variable, queryRunner)

            await queryRunner.commitTransaction()
        } catch (error) {
            if (queryRunner && !queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
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
