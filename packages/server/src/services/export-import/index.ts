import { StatusCodes } from 'http-status-codes'
import { EntityManager, In, QueryRunner } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { Assistant } from '../../database/entities/Assistant'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { CustomTemplate } from '../../database/entities/CustomTemplate'
import { DocumentStore } from '../../database/entities/DocumentStore'
import { DocumentStoreFileChunk } from '../../database/entities/DocumentStoreFileChunk'
import { Execution } from '../../database/entities/Execution'
import { Tool } from '../../database/entities/Tool'
import { Variable } from '../../database/entities/Variable'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { Platform } from '../../Interface'
import assistantsService from '../../services/assistants'
import chatflowsService from '../../services/chatflows'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { checkUsageLimit } from '../../utils/quotaUsage'
import { sanitizeNullBytes } from '../../utils/sanitize.util'
import assistantService from '../assistants'
import chatMessagesService from '../chat-messages'
import chatflowService from '../chatflows'
import documenStoreService from '../documentstore'
import executionService, { ExecutionFilters } from '../executions'
import marketplacesService from '../marketplaces'
import toolsService from '../tools'
import variableService from '../variables'

type ExportInput = {
    agentflow: boolean
    agentflowv2: boolean
    assistantCustom: boolean
    assistantOpenAI: boolean
    assistantAzure: boolean
    chatflow: boolean
    chat_message: boolean
    chat_feedback: boolean
    custom_template: boolean
    document_store: boolean
    execution: boolean
    tool: boolean
    variable: boolean
}

type ExportData = {
    AgentFlow: ChatFlow[]
    AgentFlowV2: ChatFlow[]
    AssistantCustom: Assistant[]
    AssistantFlow: ChatFlow[]
    AssistantOpenAI: Assistant[]
    AssistantAzure: Assistant[]
    ChatFlow: ChatFlow[]
    ChatMessage: ChatMessage[]
    ChatMessageFeedback: ChatMessageFeedback[]
    CustomTemplate: CustomTemplate[]
    DocumentStore: DocumentStore[]
    DocumentStoreFileChunk: DocumentStoreFileChunk[]
    Execution: Execution[]
    Tool: Tool[]
    Variable: Variable[]
}

const convertExportInput = (body: any): ExportInput => {
    try {
        if (!body || typeof body !== 'object') throw new Error('Invalid ExportInput object in request body')
        if (body.agentflow && typeof body.agentflow !== 'boolean') throw new Error('Invalid agentflow property in ExportInput object')
        if (body.agentflowv2 && typeof body.agentflowv2 !== 'boolean') throw new Error('Invalid agentflowv2 property in ExportInput object')
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
        if (body.execution && typeof body.execution !== 'boolean') throw new Error('Invalid execution property in ExportInput object')
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
const exportData = async (exportInput: ExportInput, activeWorkspaceId: string): Promise<{ FileDefaultName: string } & ExportData> => {
    try {
        let AgentFlow: ChatFlow[] | { data: ChatFlow[]; total: number } =
            exportInput.agentflow === true ? await chatflowService.getAllChatflows('MULTIAGENT', activeWorkspaceId) : []
        AgentFlow = 'data' in AgentFlow ? AgentFlow.data : AgentFlow

        let AgentFlowV2: ChatFlow[] | { data: ChatFlow[]; total: number } =
            exportInput.agentflowv2 === true ? await chatflowService.getAllChatflows('AGENTFLOW', activeWorkspaceId) : []
        AgentFlowV2 = 'data' in AgentFlowV2 ? AgentFlowV2.data : AgentFlowV2

        let AssistantCustom: Assistant[] =
            exportInput.assistantCustom === true ? await assistantService.getAllAssistants(activeWorkspaceId, 'CUSTOM') : []

        let AssistantFlow: ChatFlow[] | { data: ChatFlow[]; total: number } =
            exportInput.assistantCustom === true ? await chatflowService.getAllChatflows('ASSISTANT', activeWorkspaceId) : []
        AssistantFlow = 'data' in AssistantFlow ? AssistantFlow.data : AssistantFlow

        let AssistantOpenAI: Assistant[] =
            exportInput.assistantOpenAI === true ? await assistantService.getAllAssistants(activeWorkspaceId, 'OPENAI') : []

        let AssistantAzure: Assistant[] =
            exportInput.assistantAzure === true ? await assistantService.getAllAssistants(activeWorkspaceId, 'AZURE') : []

        let ChatFlow: ChatFlow[] | { data: ChatFlow[]; total: number } =
            exportInput.chatflow === true ? await chatflowService.getAllChatflows('CHATFLOW', activeWorkspaceId) : []
        ChatFlow = 'data' in ChatFlow ? ChatFlow.data : ChatFlow

        let allChatflow: ChatFlow[] | { data: ChatFlow[]; total: number } =
            exportInput.chat_message === true || exportInput.chat_feedback === true
                ? await chatflowService.getAllChatflows(undefined, activeWorkspaceId)
                : []
        allChatflow = 'data' in allChatflow ? allChatflow.data : allChatflow
        const chatflowIds = allChatflow.map((chatflow) => chatflow.id)

        let ChatMessage: ChatMessage[] =
            exportInput.chat_message === true ? await chatMessagesService.getMessagesByChatflowIds(chatflowIds) : []

        let ChatMessageFeedback: ChatMessageFeedback[] =
            exportInput.chat_feedback === true ? await chatMessagesService.getMessagesFeedbackByChatflowIds(chatflowIds) : []

        let CustomTemplate: CustomTemplate[] =
            exportInput.custom_template === true ? await marketplacesService.getAllCustomTemplates(activeWorkspaceId) : []

        let DocumentStore: DocumentStore[] | { data: DocumentStore[]; total: number } =
            exportInput.document_store === true ? await documenStoreService.getAllDocumentStores(activeWorkspaceId) : []
        DocumentStore = 'data' in DocumentStore ? DocumentStore.data : DocumentStore

        const documentStoreIds = DocumentStore.map((documentStore) => documentStore.id)

        let DocumentStoreFileChunk: DocumentStoreFileChunk[] =
            exportInput.document_store === true
                ? await documenStoreService.getAllDocumentFileChunksByDocumentStoreIds(documentStoreIds)
                : []

        const filters: ExecutionFilters = { workspaceId: activeWorkspaceId }
        const { data: totalExecutions } = exportInput.execution === true ? await executionService.getAllExecutions(filters) : { data: [] }
        let Execution: Execution[] = exportInput.execution === true ? totalExecutions : []

        let Tool: Tool[] | { data: Tool[]; total: number } =
            exportInput.tool === true ? await toolsService.getAllTools(activeWorkspaceId) : []
        Tool = 'data' in Tool ? Tool.data : Tool

        let Variable: Variable[] | { data: Variable[]; total: number } =
            exportInput.variable === true ? await variableService.getAllVariables(activeWorkspaceId) : []
        Variable = 'data' in Variable ? Variable.data : Variable

        return {
            FileDefaultName,
            AgentFlow,
            AgentFlowV2,
            AssistantCustom,
            AssistantFlow,
            AssistantOpenAI,
            AssistantAzure,
            ChatFlow,
            ChatMessage,
            ChatMessageFeedback,
            CustomTemplate,
            DocumentStore,
            DocumentStoreFileChunk,
            Execution,
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

async function replaceDuplicateIdsForChatFlow(queryRunner: QueryRunner, originalData: ExportData, chatflows: ChatFlow[]) {
    try {
        const ids = chatflows.map((chatflow) => chatflow.id)
        const records = await queryRunner.manager.find(ChatFlow, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            const oldId = record.id
            const newId = uuidv4()
            originalData = JSON.parse(JSON.stringify(originalData).replaceAll(oldId, newId))
        }
        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceDuplicateIdsForChatflow - ${getErrorMessage(error)}`
        )
    }
}

async function replaceDuplicateIdsForAssistant(queryRunner: QueryRunner, originalData: ExportData, assistants: Assistant[]) {
    try {
        const ids = assistants.map((assistant) => assistant.id)
        const records = await queryRunner.manager.find(Assistant, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            const oldId = record.id
            const newId = uuidv4()
            originalData = JSON.parse(JSON.stringify(originalData).replaceAll(oldId, newId))
        }
        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceDuplicateIdsForAssistant - ${getErrorMessage(error)}`
        )
    }
}

async function replaceDuplicateIdsForChatMessage(
    queryRunner: QueryRunner,
    originalData: ExportData,
    chatMessages: ChatMessage[],
    activeWorkspaceId?: string
) {
    try {
        const chatmessageChatflowIds = chatMessages.map((chatMessage) => {
            return { id: chatMessage.chatflowid, qty: 0 }
        })
        const originalDataChatflowIds = [
            ...originalData.AssistantFlow.map((assistantFlow) => assistantFlow.id),
            ...originalData.AgentFlow.map((agentFlow) => agentFlow.id),
            ...originalData.AgentFlowV2.map((agentFlowV2) => agentFlowV2.id),
            ...originalData.ChatFlow.map((chatFlow) => chatFlow.id)
        ]
        chatmessageChatflowIds.forEach((item) => {
            if (originalDataChatflowIds.includes(item.id)) {
                item.qty += 1
            }
        })
        const databaseChatflowIds = await (
            await queryRunner.manager.find(ChatFlow, {
                where: {
                    id: In(chatmessageChatflowIds.map((chatmessageChatflowId) => chatmessageChatflowId.id)),
                    workspaceId: activeWorkspaceId
                }
            })
        ).map((chatflow) => chatflow.id)
        chatmessageChatflowIds.forEach((item) => {
            if (databaseChatflowIds.includes(item.id)) {
                item.qty += 1
            }
        })

        const missingChatflowIds = chatmessageChatflowIds.filter((item) => item.qty === 0).map((item) => item.id)
        if (missingChatflowIds.length > 0) {
            chatMessages = chatMessages.filter((chatMessage) => !missingChatflowIds.includes(chatMessage.chatflowid))
            originalData.ChatMessage = chatMessages
        }

        const ids = chatMessages.map((chatMessage) => chatMessage.id)
        const records = await queryRunner.manager.find(ChatMessage, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData

        // Replace duplicate ChatMessage ids found in db with new ids,
        // and update corresponding messageId references in ChatMessageFeedback
        const idMap: { [key: string]: string } = {}
        const dbExistingIds = new Set(records.map((record) => record.id))
        originalData.ChatMessage = originalData.ChatMessage.map((item) => {
            if (dbExistingIds.has(item.id)) {
                const newId = uuidv4()
                idMap[item.id] = newId
                return { ...item, id: newId }
            }
            return item
        })
        originalData.ChatMessageFeedback = originalData.ChatMessageFeedback.map((item) => {
            if (idMap[item.messageId]) {
                return { ...item, messageId: idMap[item.messageId] }
            }
            return item
        })
        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceDuplicateIdsForChatMessage - ${getErrorMessage(error)}`
        )
    }
}

async function replaceExecutionIdForChatMessage(
    queryRunner: QueryRunner,
    originalData: ExportData,
    chatMessages: ChatMessage[],
    activeWorkspaceId?: string
) {
    try {
        // step 1 - get all execution ids from chatMessages
        const chatMessageExecutionIds = chatMessages
            .map((chatMessage) => {
                return { id: chatMessage.executionId, qty: 0 }
            })
            .filter((item): item is { id: string; qty: number } => item !== undefined)

        // step 2 - increase qty if execution id is in importData.Execution
        const originalDataExecutionIds = originalData.Execution.map((execution) => execution.id)
        chatMessageExecutionIds.forEach((item) => {
            if (originalDataExecutionIds.includes(item.id)) {
                item.qty += 1
            }
        })

        // step 3 - increase qty if execution id is in database
        const databaseExecutionIds = await (
            await queryRunner.manager.find(Execution, {
                where: {
                    id: In(chatMessageExecutionIds.map((chatMessageExecutionId) => chatMessageExecutionId.id)),
                    workspaceId: activeWorkspaceId
                }
            })
        ).map((execution) => execution.id)
        chatMessageExecutionIds.forEach((item) => {
            if (databaseExecutionIds.includes(item.id)) {
                item.qty += 1
            }
        })

        // step 4 - if executionIds not found replace with NULL
        const missingExecutionIds = chatMessageExecutionIds.filter((item) => item.qty === 0).map((item) => item.id)
        chatMessages.forEach((chatMessage) => {
            if (chatMessage.executionId && missingExecutionIds.includes(chatMessage.executionId)) {
                delete chatMessage.executionId
            }
        })

        originalData.ChatMessage = chatMessages

        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceExecutionIdForChatMessage - ${getErrorMessage(error)}`
        )
    }
}

async function replaceDuplicateIdsForChatMessageFeedback(
    queryRunner: QueryRunner,
    originalData: ExportData,
    chatMessageFeedbacks: ChatMessageFeedback[],
    activeWorkspaceId?: string
) {
    try {
        const feedbackChatflowIds = chatMessageFeedbacks.map((feedback) => {
            return { id: feedback.chatflowid, qty: 0 }
        })
        const originalDataChatflowIds = [
            ...originalData.AssistantFlow.map((assistantFlow) => assistantFlow.id),
            ...originalData.AgentFlow.map((agentFlow) => agentFlow.id),
            ...originalData.AgentFlowV2.map((agentFlowV2) => agentFlowV2.id),
            ...originalData.ChatFlow.map((chatFlow) => chatFlow.id)
        ]
        feedbackChatflowIds.forEach((item) => {
            if (originalDataChatflowIds.includes(item.id)) {
                item.qty += 1
            }
        })
        const databaseChatflowIds = await (
            await queryRunner.manager.find(ChatFlow, {
                where: { id: In(feedbackChatflowIds.map((feedbackChatflowId) => feedbackChatflowId.id)), workspaceId: activeWorkspaceId }
            })
        ).map((chatflow) => chatflow.id)
        feedbackChatflowIds.forEach((item) => {
            if (databaseChatflowIds.includes(item.id)) {
                item.qty += 1
            }
        })

        const feedbackMessageIds = chatMessageFeedbacks.map((feedback) => {
            return { id: feedback.messageId, qty: 0 }
        })
        const originalDataMessageIds = originalData.ChatMessage.map((chatMessage) => chatMessage.id)
        feedbackMessageIds.forEach((item) => {
            if (originalDataMessageIds.includes(item.id)) {
                item.qty += 1
            }
        })
        const databaseMessageIds = await (
            await queryRunner.manager.find(ChatMessage, {
                where: { id: In(feedbackMessageIds.map((feedbackMessageId) => feedbackMessageId.id)) }
            })
        ).map((chatMessage) => chatMessage.id)
        feedbackMessageIds.forEach((item) => {
            if (databaseMessageIds.includes(item.id)) {
                item.qty += 1
            }
        })

        const missingChatflowIds = feedbackChatflowIds.filter((item) => item.qty === 0).map((item) => item.id)
        const missingMessageIds = feedbackMessageIds.filter((item) => item.qty === 0).map((item) => item.id)

        if (missingChatflowIds.length > 0 || missingMessageIds.length > 0) {
            chatMessageFeedbacks = chatMessageFeedbacks.filter(
                (feedback) => !missingChatflowIds.includes(feedback.chatflowid) && !missingMessageIds.includes(feedback.messageId)
            )
            originalData.ChatMessageFeedback = chatMessageFeedbacks
        }

        const ids = chatMessageFeedbacks.map((chatMessageFeedback) => chatMessageFeedback.id)
        const records = await queryRunner.manager.find(ChatMessageFeedback, {
            where: { id: In(ids) }
        })

        // remove duplicate messageId
        const seenMessageIds = new Set()
        originalData.ChatMessageFeedback = originalData.ChatMessageFeedback.filter((feedback) => {
            if (seenMessageIds.has(feedback.messageId)) {
                return false
            }
            seenMessageIds.add(feedback.messageId)
            return true
        })

        if (records.length < 0) return originalData

        // replace duplicate ids found in db to new id
        const dbExistingIds = new Set(records.map((record) => record.id))
        originalData.ChatMessageFeedback = originalData.ChatMessageFeedback.map((item) => {
            if (dbExistingIds.has(item.id)) {
                const newId = uuidv4()
                return { ...item, id: newId }
            }
            return item
        })
        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceDuplicateIdsForChatMessageFeedback - ${getErrorMessage(error)}`
        )
    }
}

async function replaceDuplicateIdsForCustomTemplate(queryRunner: QueryRunner, originalData: ExportData, customTemplates: CustomTemplate[]) {
    try {
        const ids = customTemplates.map((customTemplate) => customTemplate.id)
        const records = await queryRunner.manager.find(CustomTemplate, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            const oldId = record.id
            const newId = uuidv4()
            originalData = JSON.parse(JSON.stringify(originalData).replaceAll(oldId, newId))
        }
        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceDuplicateIdsForCustomTemplate - ${getErrorMessage(error)}`
        )
    }
}

async function replaceDuplicateIdsForDocumentStore(queryRunner: QueryRunner, originalData: ExportData, documentStores: DocumentStore[]) {
    try {
        const ids = documentStores.map((documentStore) => documentStore.id)
        const records = await queryRunner.manager.find(DocumentStore, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            const oldId = record.id
            const newId = uuidv4()
            originalData = JSON.parse(JSON.stringify(originalData).replaceAll(oldId, newId))
        }
        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceDuplicateIdsForDocumentStore - ${getErrorMessage(error)}`
        )
    }
}

async function replaceDuplicateIdsForDocumentStoreFileChunk(
    queryRunner: QueryRunner,
    originalData: ExportData,
    documentStoreFileChunks: DocumentStoreFileChunk[]
) {
    try {
        const ids = documentStoreFileChunks.map((documentStoreFileChunk) => documentStoreFileChunk.id)
        const records = await queryRunner.manager.find(DocumentStoreFileChunk, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData

        // replace duplicate ids found in db to new id
        const dbExistingIds = new Set(records.map((record) => record.id))
        originalData.DocumentStoreFileChunk = originalData.DocumentStoreFileChunk.map((item) => {
            if (dbExistingIds.has(item.id)) {
                return { ...item, id: uuidv4() }
            }
            return item
        })
        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceDuplicateIdsForDocumentStoreFileChunk - ${getErrorMessage(error)}`
        )
    }
}

async function replaceDuplicateIdsForTool(queryRunner: QueryRunner, originalData: ExportData, tools: Tool[]) {
    try {
        const ids = tools.map((tool) => tool.id)
        const records = await queryRunner.manager.find(Tool, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            const oldId = record.id
            const newId = uuidv4()
            originalData = JSON.parse(JSON.stringify(originalData).replaceAll(oldId, newId))
        }
        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceDuplicateIdsForTool - ${getErrorMessage(error)}`
        )
    }
}

async function replaceDuplicateIdsForVariable(queryRunner: QueryRunner, originalData: ExportData, variables: Variable[]) {
    try {
        const ids = variables.map((variable) => variable.id)
        const records = await queryRunner.manager.find(Variable, {
            where: { id: In(ids) }
        })
        if (getRunningExpressApp().identityManager.getPlatformType() === Platform.CLOUD)
            originalData.Variable = originalData.Variable.filter((variable) => variable.type !== 'runtime')
        if (records.length < 0) return originalData
        for (let record of records) {
            const oldId = record.id
            const newId = uuidv4()
            originalData = JSON.parse(JSON.stringify(originalData).replaceAll(oldId, newId))
        }
        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceDuplicateIdsForVariable - ${getErrorMessage(error)}`
        )
    }
}

async function replaceDuplicateIdsForExecution(queryRunner: QueryRunner, originalData: ExportData, executions: Execution[]) {
    try {
        const ids = executions.map((execution) => execution.id)
        const records = await queryRunner.manager.find(Execution, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            const oldId = record.id
            const newId = uuidv4()
            originalData = JSON.parse(JSON.stringify(originalData).replaceAll(oldId, newId))
        }
        return originalData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.replaceDuplicateIdsForExecution - ${getErrorMessage(error)}`
        )
    }
}

function reduceSpaceForChatflowFlowData(chatflows: ChatFlow[]) {
    return chatflows.map((chatflow) => {
        return { ...chatflow, flowData: JSON.stringify(JSON.parse(chatflow.flowData)) }
    })
}

function insertWorkspaceId(importedData: any, activeWorkspaceId?: string) {
    if (!activeWorkspaceId) return importedData
    importedData.forEach((item: any) => {
        if (item.type === 'Tool') {
            // TODO: This is a temporary fix where export data for CustomTemplate type Tool need to be changed in the future.
            // Also handles backward compatibility for previously exported data where CustomTemplate type Tool does not have flowData field.
            item.flowData = JSON.stringify({
                iconSrc: item.iconSrc,
                schema: item.schema,
                func: item.func
            })
        }
        item.workspaceId = activeWorkspaceId
    })
    return importedData
}

async function saveBatch(manager: EntityManager, entity: any, items: any[], batchSize = 900) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        await manager.save(entity, batch)
    }
}

const importData = async (importData: ExportData, orgId: string, activeWorkspaceId: string, subscriptionId: string) => {
    // Initialize missing properties with empty arrays to avoid "undefined" errors
    importData.AgentFlow = importData.AgentFlow || []
    importData.AgentFlowV2 = importData.AgentFlowV2 || []
    importData.AssistantCustom = importData.AssistantCustom || []
    importData.AssistantFlow = importData.AssistantFlow || []
    importData.AssistantOpenAI = importData.AssistantOpenAI || []
    importData.AssistantAzure = importData.AssistantAzure || []
    importData.ChatFlow = importData.ChatFlow || []
    importData.ChatMessage = importData.ChatMessage || []
    importData.ChatMessageFeedback = importData.ChatMessageFeedback || []
    importData.CustomTemplate = importData.CustomTemplate || []
    importData.DocumentStore = importData.DocumentStore || []
    importData.DocumentStoreFileChunk = importData.DocumentStoreFileChunk || []
    importData.Execution = importData.Execution || []
    importData.Tool = importData.Tool || []
    importData.Variable = importData.Variable || []

    let queryRunner
    try {
        queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            if (importData.AgentFlow.length > 0) {
                importData.AgentFlow = reduceSpaceForChatflowFlowData(importData.AgentFlow)
                importData.AgentFlow = insertWorkspaceId(importData.AgentFlow, activeWorkspaceId)
                const existingChatflowCount = await chatflowsService.getAllChatflowsCountByOrganization('MULTIAGENT', orgId)
                const newChatflowCount = importData.AgentFlow.length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingChatflowCount + newChatflowCount
                )
                importData = await replaceDuplicateIdsForChatFlow(queryRunner, importData, importData.AgentFlow)
            }
            if (importData.AgentFlowV2.length > 0) {
                importData.AgentFlowV2 = reduceSpaceForChatflowFlowData(importData.AgentFlowV2)
                importData.AgentFlowV2 = insertWorkspaceId(importData.AgentFlowV2, activeWorkspaceId)
                const existingChatflowCount = await chatflowsService.getAllChatflowsCountByOrganization('AGENTFLOW', orgId)
                const newChatflowCount = importData.AgentFlowV2.length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingChatflowCount + newChatflowCount
                )
                importData = await replaceDuplicateIdsForChatFlow(queryRunner, importData, importData.AgentFlowV2)
            }
            if (importData.AssistantCustom.length > 0) {
                importData.AssistantCustom = insertWorkspaceId(importData.AssistantCustom, activeWorkspaceId)
                const existingAssistantCount = await assistantsService.getAssistantsCountByOrganization('CUSTOM', orgId)
                const newAssistantCount = importData.AssistantCustom.length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingAssistantCount + newAssistantCount
                )
                importData = await replaceDuplicateIdsForAssistant(queryRunner, importData, importData.AssistantCustom)
            }
            if (importData.AssistantFlow.length > 0) {
                importData.AssistantFlow = reduceSpaceForChatflowFlowData(importData.AssistantFlow)
                importData.AssistantFlow = insertWorkspaceId(importData.AssistantFlow, activeWorkspaceId)
                const existingChatflowCount = await chatflowsService.getAllChatflowsCountByOrganization('ASSISTANT', orgId)
                const newChatflowCount = importData.AssistantFlow.length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingChatflowCount + newChatflowCount
                )
                importData = await replaceDuplicateIdsForChatFlow(queryRunner, importData, importData.AssistantFlow)
            }
            if (importData.AssistantOpenAI.length > 0) {
                importData.AssistantOpenAI = insertWorkspaceId(importData.AssistantOpenAI, activeWorkspaceId)
                const existingAssistantCount = await assistantsService.getAssistantsCountByOrganization('OPENAI', orgId)
                const newAssistantCount = importData.AssistantOpenAI.length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingAssistantCount + newAssistantCount
                )
                importData = await replaceDuplicateIdsForAssistant(queryRunner, importData, importData.AssistantOpenAI)
            }
            if (importData.AssistantAzure.length > 0) {
                importData.AssistantAzure = insertWorkspaceId(importData.AssistantAzure, activeWorkspaceId)
                const existingAssistantCount = await assistantsService.getAssistantsCountByOrganization('AZURE', orgId)
                const newAssistantCount = importData.AssistantAzure.length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingAssistantCount + newAssistantCount
                )
                importData = await replaceDuplicateIdsForAssistant(queryRunner, importData, importData.AssistantAzure)
            }
            if (importData.ChatFlow.length > 0) {
                importData.ChatFlow = reduceSpaceForChatflowFlowData(importData.ChatFlow)
                importData.ChatFlow = insertWorkspaceId(importData.ChatFlow, activeWorkspaceId)
                const existingChatflowCount = await chatflowsService.getAllChatflowsCountByOrganization('CHATFLOW', orgId)
                const newChatflowCount = importData.ChatFlow.length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingChatflowCount + newChatflowCount
                )
                importData = await replaceDuplicateIdsForChatFlow(queryRunner, importData, importData.ChatFlow)
            }
            if (importData.ChatMessage.length > 0) {
                importData = await replaceDuplicateIdsForChatMessage(queryRunner, importData, importData.ChatMessage, activeWorkspaceId)
                importData = await replaceExecutionIdForChatMessage(queryRunner, importData, importData.ChatMessage, activeWorkspaceId)
            }
            if (importData.ChatMessageFeedback.length > 0)
                importData = await replaceDuplicateIdsForChatMessageFeedback(
                    queryRunner,
                    importData,
                    importData.ChatMessageFeedback,
                    activeWorkspaceId
                )
            if (importData.CustomTemplate.length > 0) {
                importData.CustomTemplate = insertWorkspaceId(importData.CustomTemplate, activeWorkspaceId)
                importData = await replaceDuplicateIdsForCustomTemplate(queryRunner, importData, importData.CustomTemplate)
            }
            if (importData.DocumentStore.length > 0) {
                importData.DocumentStore = insertWorkspaceId(importData.DocumentStore, activeWorkspaceId)
                importData = await replaceDuplicateIdsForDocumentStore(queryRunner, importData, importData.DocumentStore)
            }
            if (importData.DocumentStoreFileChunk.length > 0)
                importData = await replaceDuplicateIdsForDocumentStoreFileChunk(queryRunner, importData, importData.DocumentStoreFileChunk)
            if (importData.Tool.length > 0) {
                importData.Tool = insertWorkspaceId(importData.Tool, activeWorkspaceId)
                importData = await replaceDuplicateIdsForTool(queryRunner, importData, importData.Tool)
            }
            if (importData.Execution.length > 0) {
                importData.Execution = insertWorkspaceId(importData.Execution, activeWorkspaceId)
                importData = await replaceDuplicateIdsForExecution(queryRunner, importData, importData.Execution)
            }
            if (importData.Variable.length > 0) {
                importData.Variable = insertWorkspaceId(importData.Variable, activeWorkspaceId)
                importData = await replaceDuplicateIdsForVariable(queryRunner, importData, importData.Variable)
            }

            importData = sanitizeNullBytes(importData)

            await queryRunner.startTransaction()

            if (importData.AgentFlow.length > 0) await queryRunner.manager.save(ChatFlow, importData.AgentFlow)
            if (importData.AgentFlowV2.length > 0) await queryRunner.manager.save(ChatFlow, importData.AgentFlowV2)
            if (importData.AssistantFlow.length > 0) await queryRunner.manager.save(ChatFlow, importData.AssistantFlow)
            if (importData.AssistantCustom.length > 0) await queryRunner.manager.save(Assistant, importData.AssistantCustom)
            if (importData.AssistantOpenAI.length > 0) await queryRunner.manager.save(Assistant, importData.AssistantOpenAI)
            if (importData.AssistantAzure.length > 0) await queryRunner.manager.save(Assistant, importData.AssistantAzure)
            if (importData.ChatFlow.length > 0) await queryRunner.manager.save(ChatFlow, importData.ChatFlow)
            if (importData.ChatMessage.length > 0) await saveBatch(queryRunner.manager, ChatMessage, importData.ChatMessage)
            if (importData.ChatMessageFeedback.length > 0)
                await queryRunner.manager.save(ChatMessageFeedback, importData.ChatMessageFeedback)
            if (importData.CustomTemplate.length > 0) await queryRunner.manager.save(CustomTemplate, importData.CustomTemplate)
            if (importData.DocumentStore.length > 0) await queryRunner.manager.save(DocumentStore, importData.DocumentStore)
            if (importData.DocumentStoreFileChunk.length > 0)
                await saveBatch(queryRunner.manager, DocumentStoreFileChunk, importData.DocumentStoreFileChunk)
            if (importData.Tool.length > 0) await queryRunner.manager.save(Tool, importData.Tool)
            if (importData.Execution.length > 0) await queryRunner.manager.save(Execution, importData.Execution)
            if (importData.Variable.length > 0) await queryRunner.manager.save(Variable, importData.Variable)

            await queryRunner.commitTransaction()
        } catch (error) {
            if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (!queryRunner.isReleased) await queryRunner.release()
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
