import { StatusCodes } from 'http-status-codes'
import { EntityManager, In, QueryRunner } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { Assistant } from '../../database/entities/Assistant'
import { ChatFlow, EnumChatflowType } from '../../database/entities/ChatFlow'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { CustomTemplate } from '../../database/entities/CustomTemplate'
import { DocumentStore } from '../../database/entities/DocumentStore'
import { DocumentStoreFileChunk } from '../../database/entities/DocumentStoreFileChunk'
import { Execution } from '../../database/entities/Execution'
import { Credential } from '../../database/entities/Credential'
import { Tool } from '../../database/entities/Tool'
import { Variable } from '../../database/entities/Variable'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import assistantsService from '../../services/assistants'
import chatflowsService from '../../services/chatflows'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { checkUsageLimit } from '../../utils/quotaUsage'
import assistantService from '../assistants'
import chatMessagesService from '../chat-messages'
import chatflowService from '../chatflows'
import documenStoreService from '../documentstore'
import executionService, { ExecutionFilters } from '../executions'
import marketplacesService from '../marketplaces'
import toolsService from '../tools'
import variableService from '../variables'
import { AssistantType, Platform } from '../../Interface'
import { sanitizeNullBytes } from '../../utils/sanitize.util'
import credentialsService from '../credentials'
import logger from '../../utils/logger'

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

type ConflictEntityKey = keyof Pick<
    ExportData,
    | 'AgentFlow'
    | 'AgentFlowV2'
    | 'AssistantFlow'
    | 'AssistantCustom'
    | 'AssistantOpenAI'
    | 'AssistantAzure'
    | 'ChatFlow'
    | 'CustomTemplate'
    | 'DocumentStore'
    | 'Tool'
    | 'Variable'
>

type ConflictResolutionAction = 'update' | 'duplicate'

type ConflictResolution = {
    type: ConflictEntityKey
    importId: string
    existingId: string
    action: ConflictResolutionAction
}

type ImportPayload = ExportData & {
    conflictResolutions?: ConflictResolution[]
}

type ImportPreviewConflict = {
    type: ConflictEntityKey
    name: string
    importId: string
    existingId: string
}

type ImportPreview = {
    conflicts: ImportPreviewConflict[]
}

type FlowCredentialBinding = {
    chatflowId: string
    nodeId: string
    path: (string | number)[]
    property: string
    credentialId: string
}

type ExportCredentialBinding = {
    nodeId: string
    path: (string | number)[]
    property: string
    credentialName: string | null
    credentialType: string | null
}

const chatflowTypeByKey: Partial<Record<ConflictEntityKey, EnumChatflowType>> = {
    AgentFlow: EnumChatflowType.MULTIAGENT,
    AgentFlowV2: EnumChatflowType.AGENTFLOW,
    AssistantFlow: EnumChatflowType.ASSISTANT,
    ChatFlow: EnumChatflowType.CHATFLOW
}

const assistantTypeByKey: Partial<Record<ConflictEntityKey, AssistantType>> = {
    AssistantCustom: 'CUSTOM',
    AssistantOpenAI: 'OPENAI',
    AssistantAzure: 'AZURE'
}

const conflictEntityKeys: ConflictEntityKey[] = [
    'AgentFlow',
    'AgentFlowV2',
    'AssistantFlow',
    'AssistantCustom',
    'AssistantOpenAI',
    'AssistantAzure',
    'ChatFlow',
    'CustomTemplate',
    'DocumentStore',
    'Tool',
    'Variable'
]

const getAssistantName = (details?: string): string | undefined => {
    if (!details) return undefined
    try {
        const parsed = JSON.parse(details)
        if (parsed && typeof parsed === 'object' && parsed.name) {
            return parsed.name
        }
    } catch (error) {
        // ignore malformed assistant details
    }
    return undefined
}

const FLOWISE_CREDENTIAL_ID_KEY = 'FLOWISE_CREDENTIAL_ID'

const sanitizeInputsForExport = (inputs: any, inputParams: any[]): any => {
    if (!inputs || typeof inputs !== 'object') return {}

    const sanitizedInputs: Record<string, any> = {}
    for (const inputName of Object.keys(inputs)) {
        const param = Array.isArray(inputParams)
            ? inputParams.find((inp: any) => inp && inp.name === inputName)
            : undefined
        if (param && (param.type === 'password' || param.type === 'file' || param.type === 'folder')) continue
        sanitizedInputs[inputName] = inputs[inputName]
    }
    return sanitizedInputs
}

const stripCredentialIds = (
    value: any,
    path: (string | number)[],
    nodeId: string,
    chatflowId: string,
    accumulator: FlowCredentialBinding[]
): any => {
    if (!value || typeof value !== 'object') return value

    if (Array.isArray(value)) {
        return value.map((item, index) => stripCredentialIds(item, [...path, index], nodeId, chatflowId, accumulator))
    }

    const cloned: Record<string, any> = {}
    for (const [key, child] of Object.entries(value)) {
        if (key === FLOWISE_CREDENTIAL_ID_KEY) {
            if (typeof child === 'string' && child.trim().length > 0) {
                accumulator.push({
                    chatflowId,
                    nodeId,
                    path,
                    property: key,
                    credentialId: child
                })
            }
            continue
        }
        cloned[key] = stripCredentialIds(child, [...path, key], nodeId, chatflowId, accumulator)
    }
    return cloned
}

const collectCredentialBindingsFromChatflow = (
    chatflow: ChatFlow
): { parsed: any; bindings: FlowCredentialBinding[] } | null => {
    if (!chatflow.flowData) return null
    try {
        const parsed = JSON.parse(chatflow.flowData)
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.nodes)) return { parsed, bindings: [] }

        const bindings: FlowCredentialBinding[] = []
        for (const node of parsed.nodes) {
            if (!node || typeof node !== 'object') continue
            const nodeId = node.id || node?.data?.id
            if (!nodeId || !node.data) continue

            const nodeData = node.data
            const sanitizedInputs = sanitizeInputsForExport(nodeData.inputs, nodeData.inputParams)
            const exportableNodeData = {
                id: nodeData.id,
                label: nodeData.label,
                version: nodeData.version,
                name: nodeData.name,
                type: nodeData.type,
                color: nodeData.color,
                hideOutput: nodeData.hideOutput,
                hideInput: nodeData.hideInput,
                baseClasses: nodeData.baseClasses,
                tags: nodeData.tags,
                category: nodeData.category,
                description: nodeData.description,
                inputParams: nodeData.inputParams,
                inputAnchors: nodeData.inputAnchors,
                inputs: sanitizedInputs,
                outputAnchors: nodeData.outputAnchors,
                outputs: nodeData.outputs,
                selected: false
            }

            stripCredentialIds(exportableNodeData, ['data'], nodeId, chatflow.id, bindings)

            const existingBindingKeys = new Set(
                bindings
                    .filter((binding) => binding.nodeId === nodeId)
                    .map((binding) => `${binding.path.join('.') ?? '<root>'}:${binding.property}`)
            )

            const ensureBinding = (
                path: (string | number)[],
                property: string,
                credentialValue: unknown
            ) => {
                if (typeof credentialValue !== 'string') return
                const trimmed = credentialValue.trim()
                if (!trimmed) return
                const key = `${path.join('.') ?? '<root>'}:${property}`
                if (existingBindingKeys.has(key)) return
                bindings.push({
                    chatflowId: chatflow.id,
                    nodeId,
                    path,
                    property,
                    credentialId: trimmed
                })
                existingBindingKeys.add(key)
            }

            ensureBinding(['data', 'inputs'], FLOWISE_CREDENTIAL_ID_KEY, nodeData.inputs?.[FLOWISE_CREDENTIAL_ID_KEY])
            ensureBinding(['data'], 'credential', nodeData.credential)

            if (Array.isArray(nodeData.inputParams)) {
                for (const param of nodeData.inputParams) {
                    if (!param || param.type !== 'credential' || !param.name) continue
                    ensureBinding(['data', 'inputs'], param.name, nodeData.inputs?.[param.name])
                }
            }
        }
        return { parsed, bindings }
    } catch (error) {
        logger.warn(
            `Failed to parse chatflow ${chatflow.id} while collecting credential bindings: ${getErrorMessage(error)}`
        )
        return null
    }
}

const enrichChatflowsWithCredentialMetadata = async (chatflowGroups: ChatFlow[][]): Promise<void> => {
    const chatflows = chatflowGroups.flat().filter((flow) => !!flow)
    if (chatflows.length === 0) return

    const processed: Map<string, { parsed: any; bindings: FlowCredentialBinding[] }> = new Map()
    const credentialIds = new Set<string>()

    for (const chatflow of chatflows) {
        const result = collectCredentialBindingsFromChatflow(chatflow)
        if (!result) continue
        processed.set(chatflow.id, result)
        for (const binding of result.bindings) {
            credentialIds.add(binding.credentialId)
        }
    }

    if (processed.size === 0) return

    const appServer = getRunningExpressApp()
    const dataSource = appServer?.AppDataSource
    if (!dataSource) return

    let credentialLookup = new Map<string, Credential>()
    if (credentialIds.size > 0) {
        const credentials = await dataSource.getRepository(Credential).find({
            where: { id: In(Array.from(credentialIds)) }
        })
        credentialLookup = new Map(credentials.map((credential) => [credential.id, credential]))
    }

    for (const chatflow of chatflows) {
        const details = processed.get(chatflow.id)
        if (!details) continue
        const namedBindings: ExportCredentialBinding[] = []
        for (const binding of details.bindings) {
            const credential = credentialLookup.get(binding.credentialId)
            if (!credential) {
                logger.warn(
                    `Credential ${binding.credentialId} referenced in chatflow ${binding.chatflowId} could not be resolved during export`
                )
                continue
            }
            namedBindings.push({
                nodeId: binding.nodeId,
                path: binding.path,
                property: binding.property,
                credentialName: credential.name ?? null,
                credentialType: credential.credentialName ?? null
            })
        }

        if (namedBindings.length > 0) {
            details.parsed.credentialBindings = namedBindings
        } else if (details.parsed.credentialBindings) {
            delete details.parsed.credentialBindings
        }

        if (namedBindings.length > 0) {
            chatflow.flowData = JSON.stringify(details.parsed)
        }
    }
}

const formatBindingPath = (path: (string | number)[]): string => {
    if (!path || path.length === 0) return '<root>'
    let result = ''
    for (const segment of path) {
        if (typeof segment === 'number') {
            result += `[${segment}]`
        } else {
            result += result.length === 0 ? segment : `.${segment}`
        }
    }
    return result
}

const resolveBindingParent = (root: any, path: (string | number)[]): any => {
    let current = root
    for (const segment of path) {
        if (typeof segment === 'number') {
            if (!Array.isArray(current)) return undefined
            current = current[segment]
            continue
        }
        if (!current || typeof current !== 'object') return undefined
        current = (current as Record<string, any>)[segment]
    }
    return current
}

const reinstateCredentialBindingsOnImport = async (
    chatflowGroups: ChatFlow[][],
    workspaceId: string
): Promise<void> => {
    const chatflows = chatflowGroups.flat().filter((flow) => !!flow)
    if (chatflows.length === 0) return

    const flowsToProcess: { chatflow: ChatFlow; parsed: any; bindings: ExportCredentialBinding[] }[] = []

    for (const chatflow of chatflows) {
        if (!chatflow.flowData) continue
        try {
            const parsed = JSON.parse(chatflow.flowData)
            const bindings = Array.isArray(parsed?.credentialBindings) ? parsed.credentialBindings : []
            if (bindings.length === 0) continue
            flowsToProcess.push({ chatflow, parsed, bindings })
        } catch (error) {
            logger.warn(
                `Failed to parse chatflow ${chatflow.id} while reinstating credential bindings: ${getErrorMessage(error)}`
            )
        }
    }

    if (flowsToProcess.length === 0) return

    let availableCredentials: any[] = []
    try {
        availableCredentials = await credentialsService.getAllCredentials(undefined, workspaceId)
    } catch (error) {
        logger.warn(`Unable to load credentials for workspace ${workspaceId}: ${getErrorMessage(error)}`)
        return
    }

    const credentialLookup = new Map<string, { id: string }>()
    for (const credential of availableCredentials) {
        if (!credential || !credential.name || !credential.credentialName || !credential.id) continue
        const key = `${credential.name}::${credential.credentialName}`
        if (!credentialLookup.has(key)) {
            credentialLookup.set(key, { id: credential.id })
        }
    }

    for (const { chatflow, parsed, bindings } of flowsToProcess) {
        if (!Array.isArray(parsed.nodes)) {
            delete parsed.credentialBindings
            chatflow.flowData = JSON.stringify(parsed)
            continue
        }

        const nodeLookup = new Map<string, any>()
        for (const node of parsed.nodes) {
            if (!node || typeof node !== 'object') continue
            const nodeId = node.id || node?.data?.id
            if (nodeId) nodeLookup.set(nodeId, node)
        }

        for (const binding of bindings) {
            if (!binding || !binding.nodeId || !Array.isArray(binding.path) || !binding.property) continue
            if (!binding.credentialName || !binding.credentialType) {
                logger.warn(
                    `Credential binding for chatflow ${chatflow.id} on node ${binding.nodeId} is missing name or type`
                )
                continue
            }

            const key = `${binding.credentialName}::${binding.credentialType}`
            const credential = credentialLookup.get(key)
            if (!credential) {
                logger.warn(
                    `No credential named ${binding.credentialName} of type ${binding.credentialType} found for chatflow ${chatflow.id}`
                )
                continue
            }

            const node = nodeLookup.get(binding.nodeId)
            if (!node) {
                logger.warn(`Node ${binding.nodeId} not found in chatflow ${chatflow.id} while applying credential bindings`)
                continue
            }

            const parent = resolveBindingParent(node, binding.path)
            if (!parent || typeof parent !== 'object') {
                logger.warn(
                    `Path ${formatBindingPath(binding.path)} could not be resolved in node ${binding.nodeId} for chatflow ${chatflow.id}`
                )
                continue
            }

            ;(parent as Record<string, any>)[binding.property] = credential.id
        }

        delete parsed.credentialBindings
        chatflow.flowData = JSON.stringify(parsed)
    }
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

        await enrichChatflowsWithCredentialMetadata([AgentFlow, AgentFlowV2, AssistantFlow, ChatFlow])

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

const previewImportData = async (importData: ExportData, activeWorkspaceId: string): Promise<ImportPreview> => {
    try {
        const appServer = getRunningExpressApp()
        if (!appServer) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error: Unable to access application server')
        }

        const dataSource = appServer.AppDataSource
        if (!dataSource) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error: Database connection not available')
        }

        const normalizedData: ImportPayload = {
            AgentFlow: importData.AgentFlow || [],
            AgentFlowV2: importData.AgentFlowV2 || [],
            AssistantCustom: importData.AssistantCustom || [],
            AssistantFlow: importData.AssistantFlow || [],
            AssistantOpenAI: importData.AssistantOpenAI || [],
            AssistantAzure: importData.AssistantAzure || [],
            ChatFlow: importData.ChatFlow || [],
            ChatMessage: importData.ChatMessage || [],
            ChatMessageFeedback: importData.ChatMessageFeedback || [],
            CustomTemplate: importData.CustomTemplate || [],
            DocumentStore: importData.DocumentStore || [],
            DocumentStoreFileChunk: importData.DocumentStoreFileChunk || [],
            Execution: importData.Execution || [],
            Tool: importData.Tool || [],
            Variable: importData.Variable || []
        }

        const conflicts: ImportPreviewConflict[] = []

        const chatflowRepo = dataSource.getRepository(ChatFlow)
        const customTemplateRepo = dataSource.getRepository(CustomTemplate)
        const documentStoreRepo = dataSource.getRepository(DocumentStore)
        const toolRepo = dataSource.getRepository(Tool)
        const variableRepo = dataSource.getRepository(Variable)
        const assistantRepo = dataSource.getRepository(Assistant)

        const findFirstImportByName = <T extends { name?: string }>(items: T[], name: string): T | undefined =>
            items.find((item) => item.name === name)

        for (const entityKey of conflictEntityKeys) {
            const items = normalizedData[entityKey]
            if (!items || items.length === 0) continue

            if (chatflowTypeByKey[entityKey]) {
                const names = items.map((item: any) => item.name).filter((name: string | undefined) => !!name)
                if (names.length === 0) continue
                const existingChatflows = await chatflowRepo.find({
                    where: {
                        workspaceId: activeWorkspaceId,
                        type: chatflowTypeByKey[entityKey],
                        name: In(names)
                    }
                })
                for (const existing of existingChatflows) {
                    const importItem = findFirstImportByName(items as any[], existing.name)
                    if (importItem) {
                        conflicts.push({
                            type: entityKey,
                            name: existing.name,
                            existingId: existing.id,
                            importId: (importItem as any).id
                        })
                    }
                }
                continue
            }

            if (assistantTypeByKey[entityKey]) {
                const importedByName = new Map<string, Assistant>()
                for (const assistant of items as Assistant[]) {
                    const name = getAssistantName(assistant.details)
                    if (name) {
                        importedByName.set(name, assistant)
                    }
                }
                if (importedByName.size === 0) continue

                const existingAssistants = await assistantRepo.find({
                    where: {
                        workspaceId: activeWorkspaceId,
                        type: assistantTypeByKey[entityKey]
                    }
                })
                for (const existing of existingAssistants) {
                    const existingName = getAssistantName(existing.details)
                    if (!existingName) continue
                    const importItem = importedByName.get(existingName)
                    if (importItem) {
                        conflicts.push({
                            type: entityKey,
                            name: existingName,
                            existingId: existing.id,
                            importId: importItem.id
                        })
                    }
                }
                continue
            }

            if (entityKey === 'CustomTemplate') {
                const names = (items as CustomTemplate[])
                    .map((item) => item.name)
                    .filter((name): name is string => !!name)
                if (names.length === 0) continue
                const existingTemplates = await customTemplateRepo.find({
                    where: {
                        workspaceId: activeWorkspaceId,
                        name: In(names)
                    }
                })
                for (const existing of existingTemplates) {
                    const importItem = findFirstImportByName(items as any[], existing.name)
                    if (importItem) {
                        conflicts.push({
                            type: entityKey,
                            name: existing.name,
                            existingId: existing.id,
                            importId: (importItem as any).id
                        })
                    }
                }
                continue
            }

            if (entityKey === 'DocumentStore') {
                const names = (items as DocumentStore[])
                    .map((item) => item.name)
                    .filter((name): name is string => !!name)
                if (names.length === 0) continue
                const existingStores = await documentStoreRepo.find({
                    where: {
                        workspaceId: activeWorkspaceId,
                        name: In(names)
                    }
                })
                for (const existing of existingStores) {
                    const importItem = findFirstImportByName(items as any[], existing.name)
                    if (importItem) {
                        conflicts.push({
                            type: entityKey,
                            name: existing.name,
                            existingId: existing.id,
                            importId: (importItem as any).id
                        })
                    }
                }
                continue
            }

            if (entityKey === 'Tool') {
                const names = (items as Tool[])
                    .map((item) => item.name)
                    .filter((name): name is string => !!name)
                if (names.length === 0) continue
                const existingTools = await toolRepo.find({
                    where: {
                        workspaceId: activeWorkspaceId,
                        name: In(names)
                    }
                })
                for (const existing of existingTools) {
                    const importItem = findFirstImportByName(items as any[], existing.name)
                    if (importItem) {
                        conflicts.push({
                            type: entityKey,
                            name: existing.name,
                            existingId: existing.id,
                            importId: (importItem as any).id
                        })
                    }
                }
                continue
            }

            if (entityKey === 'Variable') {
                const names = (items as Variable[])
                    .map((item) => item.name)
                    .filter((name): name is string => !!name)
                if (names.length === 0) continue
                const existingVariables = await variableRepo.find({
                    where: {
                        workspaceId: activeWorkspaceId,
                        name: In(names)
                    }
                })
                for (const existing of existingVariables) {
                    const importItem = findFirstImportByName(items as any[], existing.name)
                    if (importItem) {
                        conflicts.push({
                            type: entityKey,
                            name: existing.name,
                            existingId: existing.id,
                            importId: (importItem as any).id
                        })
                    }
                }
            }
        }

        conflicts.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name)
            return conflictEntityKeys.indexOf(a.type) - conflictEntityKeys.indexOf(b.type)
        })

        return {
            conflicts
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.previewImportData - ${getErrorMessage(error)}`
        )
    }
}

async function replaceDuplicateIdsForChatFlow(
    queryRunner: QueryRunner,
    originalData: ExportData,
    chatflows: ChatFlow[],
    idsToSkip: Set<string> = new Set()
) {
    try {
        const ids = chatflows.map((chatflow) => chatflow.id)
        const records = await queryRunner.manager.find(ChatFlow, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            if (idsToSkip.has(record.id)) continue
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

async function replaceDuplicateIdsForAssistant(
    queryRunner: QueryRunner,
    originalData: ExportData,
    assistants: Assistant[],
    idsToSkip: Set<string> = new Set()
) {
    try {
        const ids = assistants.map((assistant) => assistant.id)
        const records = await queryRunner.manager.find(Assistant, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            if (idsToSkip.has(record.id)) continue
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
    activeWorkspaceId?: string,
    idsToSkip: Set<string> = new Set()
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
            if (dbExistingIds.has(item.id) && !idsToSkip.has(item.id)) {
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
    activeWorkspaceId?: string,
    idsToSkip: Set<string> = new Set()
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
            if (dbExistingIds.has(item.id) && !idsToSkip.has(item.id)) {
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

async function replaceDuplicateIdsForCustomTemplate(
    queryRunner: QueryRunner,
    originalData: ExportData,
    customTemplates: CustomTemplate[],
    idsToSkip: Set<string> = new Set()
) {
    try {
        const ids = customTemplates.map((customTemplate) => customTemplate.id)
        const records = await queryRunner.manager.find(CustomTemplate, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            if (idsToSkip.has(record.id)) continue
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

async function replaceDuplicateIdsForDocumentStore(
    queryRunner: QueryRunner,
    originalData: ExportData,
    documentStores: DocumentStore[],
    idsToSkip: Set<string> = new Set()
) {
    try {
        const ids = documentStores.map((documentStore) => documentStore.id)
        const records = await queryRunner.manager.find(DocumentStore, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            if (idsToSkip.has(record.id)) continue
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
    documentStoreFileChunks: DocumentStoreFileChunk[],
    idsToSkip: Set<string> = new Set()
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
            if (dbExistingIds.has(item.id) && !idsToSkip.has(item.id)) {
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

async function replaceDuplicateIdsForTool(
    queryRunner: QueryRunner,
    originalData: ExportData,
    tools: Tool[],
    idsToSkip: Set<string> = new Set()
) {
    try {
        const ids = tools.map((tool) => tool.id)
        const records = await queryRunner.manager.find(Tool, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            if (idsToSkip.has(record.id)) continue
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

async function replaceDuplicateIdsForVariable(
    queryRunner: QueryRunner,
    originalData: ExportData,
    variables: Variable[],
    idsToSkip: Set<string> = new Set()
) {
    try {
        const ids = variables.map((variable) => variable.id)
        const records = await queryRunner.manager.find(Variable, {
            where: { id: In(ids) }
        })
        if (getRunningExpressApp().identityManager.getPlatformType() === Platform.CLOUD)
            originalData.Variable = originalData.Variable.filter((variable) => variable.type !== 'runtime')
        if (records.length < 0) return originalData
        for (let record of records) {
            if (idsToSkip.has(record.id)) continue
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

async function replaceDuplicateIdsForExecution(
    queryRunner: QueryRunner,
    originalData: ExportData,
    executions: Execution[],
    idsToSkip: Set<string> = new Set()
) {
    try {
        const ids = executions.map((execution) => execution.id)
        const records = await queryRunner.manager.find(Execution, {
            where: { id: In(ids) }
        })
        if (records.length < 0) return originalData
        for (let record of records) {
            if (idsToSkip.has(record.id)) continue
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

const importData = async (importData: ImportPayload, orgId: string, activeWorkspaceId: string, subscriptionId: string) => {
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

    const conflictResolutions = importData.conflictResolutions || []
    delete importData.conflictResolutions

    const idsToSkipMap = conflictEntityKeys.reduce((acc, key) => {
        acc[key] = new Set<string>()
        return acc
    }, {} as Record<ConflictEntityKey, Set<string>>)

    const parentIdsMarkedForUpdate = {
        chatflow: new Set<string>(),
        documentStore: new Set<string>()
    }

    const idRemap: Record<string, string> = {}

    for (const resolution of conflictResolutions) {
        if (!resolution || !resolution.type || !resolution.importId || !resolution.existingId) continue
        if (resolution.action === 'update') {
            idRemap[resolution.importId] = resolution.existingId
            idsToSkipMap[resolution.type].add(resolution.existingId)

            if (
                resolution.type === 'AgentFlow' ||
                resolution.type === 'AgentFlowV2' ||
                resolution.type === 'AssistantFlow' ||
                resolution.type === 'ChatFlow'
            ) {
                parentIdsMarkedForUpdate.chatflow.add(resolution.existingId)
            }

            if (resolution.type === 'DocumentStore') {
                parentIdsMarkedForUpdate.documentStore.add(resolution.existingId)
            }
        }
    }

    if (Object.keys(idRemap).length > 0) {
        let serialized = JSON.stringify(importData)
        for (const [oldId, newId] of Object.entries(idRemap)) {
            if (!oldId || !newId || oldId === newId) continue
            serialized = serialized.replaceAll(oldId, newId)
        }
        importData = JSON.parse(serialized)
    }

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

    await reinstateCredentialBindingsOnImport(
        [importData.AgentFlow, importData.AgentFlowV2, importData.AssistantFlow, importData.ChatFlow],
        activeWorkspaceId
    )

    let queryRunner
    try {
        queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            if (parentIdsMarkedForUpdate.chatflow.size > 0 || parentIdsMarkedForUpdate.documentStore.size > 0) {
                const chatflowIdsToSync = Array.from(parentIdsMarkedForUpdate.chatflow)
                const documentStoreIdsToSync = Array.from(parentIdsMarkedForUpdate.documentStore)

                if (chatflowIdsToSync.length > 0) {
                    const chatMessagesToCheck = importData.ChatMessage.filter((message) =>
                        message?.chatflowid ? parentIdsMarkedForUpdate.chatflow.has(message.chatflowid) : false
                    )
                    const chatMessageIdsToCheck = chatMessagesToCheck.map((message) => message.id)

                    if (chatMessageIdsToCheck.length > 0) {
                        const existingMessages = await queryRunner.manager.find(ChatMessage, {
                            where: { id: In(chatMessageIdsToCheck) }
                        })
                        if (existingMessages.length > 0) {
                            const existingMessageIds = new Set(existingMessages.map((record) => record.id))
                            importData.ChatMessage = importData.ChatMessage.filter(
                                (message) => !existingMessageIds.has(message.id)
                            )
                        }
                    }

                    const feedbackToCheck = importData.ChatMessageFeedback.filter((feedback) =>
                        feedback?.chatflowid ? parentIdsMarkedForUpdate.chatflow.has(feedback.chatflowid) : false
                    )
                    const feedbackIdsToCheck = feedbackToCheck.map((feedback) => feedback.id)
                    if (feedbackIdsToCheck.length > 0) {
                        const existingFeedback = await queryRunner.manager.find(ChatMessageFeedback, {
                            where: { id: In(feedbackIdsToCheck) }
                        })
                        if (existingFeedback.length > 0) {
                            const existingFeedbackIds = new Set(existingFeedback.map((record) => record.id))
                            importData.ChatMessageFeedback = importData.ChatMessageFeedback.filter(
                                (feedback) => !existingFeedbackIds.has(feedback.id)
                            )
                        }
                    }

                    const executionsToCheck = importData.Execution.filter((execution) =>
                        execution?.agentflowId ? parentIdsMarkedForUpdate.chatflow.has(execution.agentflowId) : false
                    )
                    const executionIdsToCheck = executionsToCheck.map((execution) => execution.id)
                    if (executionIdsToCheck.length > 0) {
                        const existingExecutions = await queryRunner.manager.find(Execution, {
                            where: { id: In(executionIdsToCheck) }
                        })
                        if (existingExecutions.length > 0) {
                            const existingExecutionIds = new Set(existingExecutions.map((record) => record.id))
                            importData.Execution = importData.Execution.filter(
                                (execution) => !existingExecutionIds.has(execution.id)
                            )
                        }
                    }
                }

                if (documentStoreIdsToSync.length > 0) {
                    const chunksToCheck = importData.DocumentStoreFileChunk.filter((chunk) =>
                        chunk?.storeId ? parentIdsMarkedForUpdate.documentStore.has(chunk.storeId) : false
                    )
                    const chunkIdsToCheck = chunksToCheck.map((chunk) => chunk.id)
                    if (chunkIdsToCheck.length > 0) {
                        const existingChunks = await queryRunner.manager.find(DocumentStoreFileChunk, {
                            where: { id: In(chunkIdsToCheck) }
                        })
                        if (existingChunks.length > 0) {
                            const existingChunkIds = new Set(existingChunks.map((record) => record.id))
                            importData.DocumentStoreFileChunk = importData.DocumentStoreFileChunk.filter(
                                (chunk) => !existingChunkIds.has(chunk.id)
                            )
                        }
                    }
                }
            }

            if (importData.AgentFlow.length > 0) {
                importData.AgentFlow = reduceSpaceForChatflowFlowData(importData.AgentFlow)
                importData.AgentFlow = insertWorkspaceId(importData.AgentFlow, activeWorkspaceId)
                const existingChatflowCount = await chatflowsService.getAllChatflowsCountByOrganization('MULTIAGENT', orgId)
                const newChatflowCount = importData.AgentFlow.filter((chatflow) => !idsToSkipMap.AgentFlow.has(chatflow.id)).length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingChatflowCount + newChatflowCount
                )
                importData = await replaceDuplicateIdsForChatFlow(
                    queryRunner,
                    importData,
                    importData.AgentFlow,
                    idsToSkipMap.AgentFlow
                )
            }
            if (importData.AgentFlowV2.length > 0) {
                importData.AgentFlowV2 = reduceSpaceForChatflowFlowData(importData.AgentFlowV2)
                importData.AgentFlowV2 = insertWorkspaceId(importData.AgentFlowV2, activeWorkspaceId)
                const existingChatflowCount = await chatflowsService.getAllChatflowsCountByOrganization('AGENTFLOW', orgId)
                const newChatflowCount = importData.AgentFlowV2.filter(
                    (chatflow) => !idsToSkipMap.AgentFlowV2.has(chatflow.id)
                ).length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingChatflowCount + newChatflowCount
                )
                importData = await replaceDuplicateIdsForChatFlow(
                    queryRunner,
                    importData,
                    importData.AgentFlowV2,
                    idsToSkipMap.AgentFlowV2
                )
            }
            if (importData.AssistantCustom.length > 0) {
                importData.AssistantCustom = insertWorkspaceId(importData.AssistantCustom, activeWorkspaceId)
                const existingAssistantCount = await assistantsService.getAssistantsCountByOrganization('CUSTOM', orgId)
                const newAssistantCount = importData.AssistantCustom.filter(
                    (assistant) => !idsToSkipMap.AssistantCustom.has(assistant.id)
                ).length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingAssistantCount + newAssistantCount
                )
                importData = await replaceDuplicateIdsForAssistant(
                    queryRunner,
                    importData,
                    importData.AssistantCustom,
                    idsToSkipMap.AssistantCustom
                )
            }
            if (importData.AssistantFlow.length > 0) {
                importData.AssistantFlow = reduceSpaceForChatflowFlowData(importData.AssistantFlow)
                importData.AssistantFlow = insertWorkspaceId(importData.AssistantFlow, activeWorkspaceId)
                const existingChatflowCount = await chatflowsService.getAllChatflowsCountByOrganization('ASSISTANT', orgId)
                const newChatflowCount = importData.AssistantFlow.filter(
                    (chatflow) => !idsToSkipMap.AssistantFlow.has(chatflow.id)
                ).length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingChatflowCount + newChatflowCount
                )
                importData = await replaceDuplicateIdsForChatFlow(
                    queryRunner,
                    importData,
                    importData.AssistantFlow,
                    idsToSkipMap.AssistantFlow
                )
            }
            if (importData.AssistantOpenAI.length > 0) {
                importData.AssistantOpenAI = insertWorkspaceId(importData.AssistantOpenAI, activeWorkspaceId)
                const existingAssistantCount = await assistantsService.getAssistantsCountByOrganization('OPENAI', orgId)
                const newAssistantCount = importData.AssistantOpenAI.filter(
                    (assistant) => !idsToSkipMap.AssistantOpenAI.has(assistant.id)
                ).length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingAssistantCount + newAssistantCount
                )
                importData = await replaceDuplicateIdsForAssistant(
                    queryRunner,
                    importData,
                    importData.AssistantOpenAI,
                    idsToSkipMap.AssistantOpenAI
                )
            }
            if (importData.AssistantAzure.length > 0) {
                importData.AssistantAzure = insertWorkspaceId(importData.AssistantAzure, activeWorkspaceId)
                const existingAssistantCount = await assistantsService.getAssistantsCountByOrganization('AZURE', orgId)
                const newAssistantCount = importData.AssistantAzure.filter(
                    (assistant) => !idsToSkipMap.AssistantAzure.has(assistant.id)
                ).length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingAssistantCount + newAssistantCount
                )
                importData = await replaceDuplicateIdsForAssistant(
                    queryRunner,
                    importData,
                    importData.AssistantAzure,
                    idsToSkipMap.AssistantAzure
                )
            }
            if (importData.ChatFlow.length > 0) {
                importData.ChatFlow = reduceSpaceForChatflowFlowData(importData.ChatFlow)
                importData.ChatFlow = insertWorkspaceId(importData.ChatFlow, activeWorkspaceId)
                const existingChatflowCount = await chatflowsService.getAllChatflowsCountByOrganization('CHATFLOW', orgId)
                const newChatflowCount = importData.ChatFlow.filter((chatflow) => !idsToSkipMap.ChatFlow.has(chatflow.id)).length
                await checkUsageLimit(
                    'flows',
                    subscriptionId,
                    getRunningExpressApp().usageCacheManager,
                    existingChatflowCount + newChatflowCount
                )
                importData = await replaceDuplicateIdsForChatFlow(
                    queryRunner,
                    importData,
                    importData.ChatFlow,
                    idsToSkipMap.ChatFlow
                )
            }
            if (importData.ChatMessage.length > 0) {
                importData = await replaceDuplicateIdsForChatMessage(
                    queryRunner,
                    importData,
                    importData.ChatMessage,
                    activeWorkspaceId,
                    childIdsMarkedForUpdate.chatMessage
                )
                importData = await replaceExecutionIdForChatMessage(queryRunner, importData, importData.ChatMessage, activeWorkspaceId)
            }
            if (importData.ChatMessageFeedback.length > 0)
                importData = await replaceDuplicateIdsForChatMessageFeedback(
                    queryRunner,
                    importData,
                    importData.ChatMessageFeedback,
                    activeWorkspaceId,
                    childIdsMarkedForUpdate.chatMessageFeedback
                )
            if (importData.CustomTemplate.length > 0) {
                importData.CustomTemplate = insertWorkspaceId(importData.CustomTemplate, activeWorkspaceId)
                importData = await replaceDuplicateIdsForCustomTemplate(
                    queryRunner,
                    importData,
                    importData.CustomTemplate,
                    idsToSkipMap.CustomTemplate
                )
            }
            if (importData.DocumentStore.length > 0) {
                importData.DocumentStore = insertWorkspaceId(importData.DocumentStore, activeWorkspaceId)
                importData = await replaceDuplicateIdsForDocumentStore(
                    queryRunner,
                    importData,
                    importData.DocumentStore,
                    idsToSkipMap.DocumentStore
                )
            }
            if (importData.DocumentStoreFileChunk.length > 0)
                importData = await replaceDuplicateIdsForDocumentStoreFileChunk(
                    queryRunner,
                    importData,
                    importData.DocumentStoreFileChunk,
                    childIdsMarkedForUpdate.documentStoreFileChunk
                )
            if (importData.Tool.length > 0) {
                importData.Tool = insertWorkspaceId(importData.Tool, activeWorkspaceId)
                importData = await replaceDuplicateIdsForTool(queryRunner, importData, importData.Tool, idsToSkipMap.Tool)
            }
            if (importData.Execution.length > 0) {
                importData.Execution = insertWorkspaceId(importData.Execution, activeWorkspaceId)
                importData = await replaceDuplicateIdsForExecution(
                    queryRunner,
                    importData,
                    importData.Execution,
                    childIdsMarkedForUpdate.execution
                )
            }
            if (importData.Variable.length > 0) {
                importData.Variable = insertWorkspaceId(importData.Variable, activeWorkspaceId)
                importData = await replaceDuplicateIdsForVariable(
                    queryRunner,
                    importData,
                    importData.Variable,
                    idsToSkipMap.Variable
                )
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
    previewImportData,
    importData
}
