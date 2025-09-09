import { ICommonObject, removeFolderFromStorage } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { QueryRunner, In } from 'typeorm'
import { ChatflowType, IReactFlowObject, IUser } from '../../Interface'
import { FLOWISE_COUNTER_STATUS, FLOWISE_METRIC_COUNTERS } from '../../Interface.Metrics'
import { ChatFlow, ChatflowVisibility } from '../../database/entities/ChatFlow'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { UpsertHistory } from '../../database/entities/UpsertHistory'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import documentStoreService from '../../services/documentstore'
import { constructGraphs, getAppVersion, getEndingNodes, getTelemetryFlowObj, isFlowValidForStream } from '../../utils'
import { containsBase64File, updateFlowDataWithFilePaths } from '../../utils/fileRepository'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { utilGetUploadsConfig } from '../../utils/getUploadsConfig'
import logger from '../../utils/logger'
import { validate } from 'uuid'
import checkOwnership from '../../utils/checkOwnership'
import { Organization } from '../../database/entities/Organization'
import { Chat } from '../../database/entities/Chat'
import chatflowStorageService from '../chatflow-storage'

// Check if chatflow valid for streaming
const checkIfChatflowIsValidForStreaming = async (chatflowId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        //**
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })

        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        /* Check for post-processing settings, if available isStreamValid is always false */
        let chatflowConfig: ICommonObject = {}
        if (chatflow.chatbotConfig) {
            chatflowConfig = JSON.parse(chatflow.chatbotConfig)
            if (chatflowConfig?.postProcessing?.enabled === true) {
                return { isStreaming: false }
            }
        }

        if (chatflow.type === 'AGENTFLOW') {
            return { isStreaming: true }
        }

        /*** Get Ending Node with Directed Graph  ***/
        const flowData = chatflow.flowData
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const nodes = parsedFlowData.nodes
        const edges = parsedFlowData.edges
        const { graph, nodeDependencies } = constructGraphs(nodes, edges)

        const endingNodes = getEndingNodes(nodeDependencies, graph, nodes)

        let isStreaming = false
        for (const endingNode of endingNodes) {
            const endingNodeData = endingNode.data
            const isEndingNode = endingNodeData?.outputs?.output === 'EndingNode'
            // Once custom function ending node exists, flow is always unavailable to stream
            if (isEndingNode) {
                return { isStreaming: false }
            }
            isStreaming = isFlowValidForStream(nodes, endingNodeData)
        }

        // If it is a Multi/Sequential Agents, always enable streaming
        if (endingNodes.filter((node) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents').length > 0) {
            return { isStreaming: true }
        }

        const dbResponse = { isStreaming: isStreaming }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.checkIfChatflowIsValidForStreaming - ${getErrorMessage(error)}`
        )
    }
}

// Check if chatflow valid for uploads
const checkIfChatflowIsValidForUploads = async (chatflowId: string): Promise<any> => {
    try {
        const dbResponse = await utilGetUploadsConfig(chatflowId)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.checkIfChatflowIsValidForUploads - ${getErrorMessage(error)}`
        )
    }
}

const deleteChatflow = async (chatflowId: string, user: IUser | undefined): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()

        if (!user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Authentication required')
        }

        const { id: userId, organizationId, permissions } = user
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)

        // First, find the chatflow to verify ownership
        const chatflow = await chatFlowRepository.findOne({
            where: { id: chatflowId }
        })

        if (!chatflow) {
            return { affected: 0, message: 'Chatflow not found' }
        }

        // Authorization check - user can delete if:
        // 1. They own the chatflow (userId matches)
        // 2. They have org:manage permission and chatflow belongs to their organization
        // 3. They have org:manage permission and chatflow is system-wide (organizationId is null)
        const canDelete =
            chatflow.userId === userId ||
            (permissions?.includes('org:manage') && chatflow.organizationId === organizationId) ||
            (permissions?.includes('org:manage') && chatflow.organizationId === null)

        if (!canDelete) {
            throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Insufficient permissions to delete this chatflow')
        }

        // Use transaction to ensure all database operations succeed or fail together
        const dbResponse = await appServer.AppDataSource.transaction(async (transactionalEntityManager) => {
            // Delete the chatflow
            const chatflowResult = await transactionalEntityManager.getRepository(ChatFlow).softDelete({ id: chatflowId })

            // Delete all related data
            await transactionalEntityManager.getRepository(ChatMessage).softDelete({ chatflowid: chatflowId })
            await transactionalEntityManager.getRepository(ChatMessageFeedback).softDelete({ chatflowid: chatflowId })
            await transactionalEntityManager.getRepository(UpsertHistory).softDelete({ chatflowid: chatflowId })

            return chatflowResult
        })

        // File operations outside transaction (they don't support rollback anyway)
        try {
            await removeFolderFromStorage(chatflowId)
            await documentStoreService.updateDocumentStoreUsage(chatflowId, undefined)
            // Clean up S3 versioned storage
            await chatflowStorageService.deleteChatflowStorage(chatflowId)
        } catch (e) {
            logger.error(`[server]: Error deleting file storage for chatflow ${chatflowId}: ${e}`)
        }

        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.deleteChatflow - ${getErrorMessage(error)}`
        )
    }
}
type ChatflowsFilter = {
    visibility?: string
    auth0_org_id?: string
    select?: string[] // Array of field names to select
}
const getAllChatflows = async (user?: IUser, type?: ChatflowType, _filter?: ChatflowsFilter): Promise<ChatFlow[]> => {
    try {
        const appServer = getRunningExpressApp()
        const { id: userId, permissions } = user ?? {}
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)
        const queryBuilder = chatFlowRepository.createQueryBuilder('chatFlow').where(`chatFlow.userId = :userId`, { userId })

        const response = await queryBuilder.getMany()
        const dbResponse = response.map((chatflow) => ({
            ...chatflow,
            badge: chatflow?.visibility?.includes(ChatflowVisibility.MARKETPLACE)
                ? 'SHARED'
                : chatflow?.visibility?.includes(ChatflowVisibility.ORGANIZATION)
                ? 'ORGANIZATION'
                : '',
            isOwner: chatflow.userId === userId,
            canEdit: chatflow.userId === userId || permissions?.includes('org:manage')
        }))

        if (!(await checkOwnership(dbResponse, user))) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }
        if (type === 'MULTIAGENT') {
            return dbResponse.filter((chatflow) => chatflow.type === 'MULTIAGENT')
        } else if (type === 'AGENTFLOW') {
            return dbResponse.filter((chatflow) => chatflow.type === 'AGENTFLOW')
        } else if (type === 'ASSISTANT') {
            return dbResponse.filter((chatflow) => chatflow.type === 'ASSISTANT')
        } else if (type === 'CHATFLOW') {
            // fetch all chatflows that are not agentflow
            return dbResponse.filter((chatflow) => chatflow.type === 'CHATFLOW' || !chatflow.type)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getAllChatflows - ${getErrorMessage(error)}`
        )
    }
}

const getAdminChatflows = async (user?: IUser, type?: ChatflowType, filter?: ChatflowsFilter): Promise<ChatFlow[]> => {
    try {
        const appServer = getRunningExpressApp()
        const { id: userId, organizationId, permissions } = user ?? {}
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)
        const queryBuilder = chatFlowRepository
            .createQueryBuilder('chatFlow')
            .leftJoin('User', 'user', 'user.id = chatFlow.userId')
            .addSelect(['user.id', 'user.name', 'user.email'])

        // Apply field selection if specified
        if (filter?.select && filter.select.length > 0) {
            // Always include id for proper entity mapping
            const selectFields = ['chatFlow.id', ...filter.select.map((field) => `chatFlow.${field}`)]
            queryBuilder.select(selectFields)
            queryBuilder.addSelect(['user.id', 'user.name', 'user.email'])
        }

        // Handle auth0_org_id filter for cross-org access
        let targetOrgId = organizationId
        if (filter?.auth0_org_id) {
            const org = await appServer.AppDataSource.getRepository(Organization).findOne({
                where: {
                    auth0Id: filter.auth0_org_id
                }
            })
            targetOrgId = org?.id ?? organizationId
        }

        // SECURITY: Always filter by organization first - users should never see chatflows from other orgs
        if (targetOrgId) {
            queryBuilder.where('chatFlow.organizationId = :organizationId', { organizationId: targetOrgId })
        }

        // ADMIN ACCESS: Admins can see all chatflows in their organization, regular users only see their own
        const isAdmin = user?.roles?.includes('Admin')
        if (!isAdmin) {
            queryBuilder.andWhere('chatFlow.userId = :userId', { userId })
        }

        // Apply additional visibility filtering if specified
        if (filter?.visibility) {
            const visibilityConditions = filter.visibility
                .split(',')
                .map((v: string) => (v === 'Organization' ? 'Private' : v))
                .map((v: string) => `chatFlow.visibility LIKE '%${v.trim()}%'`)
                .join(' OR ')

            queryBuilder.andWhere(`(${visibilityConditions})`)
        }

        // Get default template information for comparison
        const defaultTemplate = user ? await getDefaultChatflowTemplate(user) : null
        let templateChatflow = null
        if (defaultTemplate) {
            templateChatflow = await chatFlowRepository.findOne({
                where: { id: defaultTemplate.id },
                select: ['id', 'updatedDate']
            })
        }

        const rawResults = await queryBuilder.getRawAndEntities()
        const dbResponse = rawResults.entities.map((chatflow, index) => {
            const rawData = rawResults.raw[index]

            // Determine template derivation status
            const isFromTemplate = defaultTemplate && chatflow.parentChatflowId === defaultTemplate.id
            let templateStatus = 'not_from_template' // 'up_to_date', 'outdated', 'not_from_template'

            if (isFromTemplate && templateChatflow) {
                // Compare template's updatedDate with chatflow's updatedDate
                templateStatus = new Date(templateChatflow.updatedDate) > new Date(chatflow.updatedDate) ? 'outdated' : 'up_to_date'
            }

            return {
                ...chatflow,
                user: {
                    id: rawData.user_id,
                    name: rawData.user_name,
                    email: rawData.user_email
                },
                badge: chatflow?.visibility?.includes(ChatflowVisibility.MARKETPLACE)
                    ? 'SHARED'
                    : chatflow?.visibility?.includes(ChatflowVisibility.ORGANIZATION)
                    ? 'ORGANIZATION'
                    : '',
                isOwner: chatflow.userId === userId,
                canEdit: chatflow.userId === userId || permissions?.includes('org:manage'),
                parentTemplate:
                    isFromTemplate && defaultTemplate && templateChatflow
                        ? {
                              id: defaultTemplate.id,
                              name: defaultTemplate.name,
                              lastUpdated: templateChatflow.updatedDate
                          }
                        : null,
                templateStatus,
                isFromTemplate
            }
        })

        if (!(await checkOwnership(dbResponse, user))) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }
        if (type === 'MULTIAGENT') {
            return dbResponse.filter((chatflow) => chatflow.type === 'MULTIAGENT')
        } else if (type === 'AGENTFLOW') {
            return dbResponse.filter((chatflow) => chatflow.type === 'AGENTFLOW')
        } else if (type === 'ASSISTANT') {
            return dbResponse.filter((chatflow) => chatflow.type === 'ASSISTANT')
        } else if (type === 'CHATFLOW') {
            // fetch all chatflows that are not agentflow
            return dbResponse.filter((chatflow) => chatflow.type === 'CHATFLOW' || !chatflow.type)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getAllChatflows - ${getErrorMessage(error)}`
        )
    }
}

const getChatflowByApiKey = async (apiKeyId: string, keyonly?: unknown): Promise<any> => {
    try {
        // Here we only get chatflows that are bounded by the apikeyid and chatflows that are not bounded by any apikey
        const appServer = getRunningExpressApp()
        let query = appServer.AppDataSource.getRepository(ChatFlow)
            .createQueryBuilder('cf')
            .where('cf.apikeyid = :apikeyid', { apikeyid: apiKeyId })
        if (keyonly === undefined) {
            query = query.orWhere('cf.apikeyid IS NULL').orWhere('cf.apikeyid = ""')
        }

        const dbResponse = await query.orderBy('cf.name', 'ASC').getMany()
        if (dbResponse.length < 1) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow not found in the database!`)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getChatflowByApiKey - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Get chatflow by ID with flexible data source
 * @param chatflowId - The chatflow ID to retrieve
 * @param user - User context for permissions and ownership checks
 * @param useDraft - Data source selection:
 *   - true: Include S3 draft versions (for editor UI, flowData editing)
 *   - false: Database only (for updates, reads, fresh metadata)
 * @returns Promise<ChatFlow> - The chatflow object
 */
const getChatflowById = async (chatflowId: string, user?: IUser, useDraft = true): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow)
            .createQueryBuilder('chatFlow')
            .where('chatFlow.id = :id', { id: chatflowId })
            .getOne()

        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found in the database!`)
        }

        // For unauthenticated users, only allow access to public (Marketplace) chatflows
        if (!user && !dbResponse.isPublic) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized public access to non-public chatflow`)
        }

        // For authenticated users, check permissions
        if (user) {
            const isUserOrgAdmin = user.permissions?.includes('org:manage')
            // && (user.organizationId === dbResponse.organizationId || !!dbResponse.organizationId)
            const isUsersChatflow = dbResponse.userId === user.id
            const isChatflowPublic = dbResponse.isPublic
            const hasChatflowOrgVisibility = dbResponse.visibility?.includes(ChatflowVisibility.ORGANIZATION)
            const isUserInSameOrg = dbResponse.organizationId === user.organizationId

            if (!(isUsersChatflow || isChatflowPublic || isUserOrgAdmin || (hasChatflowOrgVisibility && isUserInSameOrg))) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized to access this chatflow`)
            }
        }

        // Try to get the current version from S3 storage
        if (user && useDraft && (dbResponse.userId === user.id || user.permissions?.includes('org:manage'))) {
            try {
                const currentRecord = await chatflowStorageService.getChatflowVersion(chatflowId)
                if (currentRecord) {
                    return currentRecord
                }
            } catch (error) {
                // If S3 version fails, fall back to database version
                logger.error(`Error getting S3 version for chatflow ${chatflowId}: ${getErrorMessage(error)}`)
            }
        }

        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getChatflowById - ${getErrorMessage(error)}`
        )
    }
}

const saveChatflow = async (newChatFlow: ChatFlow): Promise<ChatFlow> => {
    try {
        const appServer = getRunningExpressApp()
        let dbResponse: ChatFlow

        // If this is a template, remove the id before saving
        if ((newChatFlow as any).isTemplate) {
            const { id, isTemplate, ...chatflowWithoutId } = newChatFlow as any
            newChatFlow = chatflowWithoutId
        }

        // Set default chatFeedback to true if chatbotConfig exists or create it if it doesn't
        if (newChatFlow.chatbotConfig) {
            try {
                const config: Record<string, any> = JSON.parse(newChatFlow.chatbotConfig)
                if (!config.chatFeedback) {
                    config.chatFeedback = { status: true }
                } else if (config.chatFeedback.status === undefined) {
                    config.chatFeedback.status = true
                }
                newChatFlow.chatbotConfig = JSON.stringify(config)
            } catch (e) {
                // If parsing fails, set a new config
                console.error(`Error parsing chatbotConfig during save:`, e)
                newChatFlow.chatbotConfig = JSON.stringify({ chatFeedback: { status: true } })
            }
        } else {
            newChatFlow.chatbotConfig = JSON.stringify({ chatFeedback: { status: true } })
        }

        // Check if the chatflow already exists
        if (newChatFlow.id) {
            const existingChatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
                where: { id: newChatFlow.id }
            })

            if (existingChatflow) {
                // Check if the user has access to the existing chatflow
                if (existingChatflow.userId !== newChatFlow.userId || existingChatflow.organizationId !== newChatFlow.organizationId) {
                    throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized to update this chatflow`)
                }
            }
        }

        if (!newChatFlow.visibility || newChatFlow.visibility.length === 0) {
            newChatFlow.visibility = [ChatflowVisibility.PRIVATE]
        } else {
            newChatFlow.visibility = Array.from(new Set([...newChatFlow.visibility, ChatflowVisibility.PRIVATE]))
        }

        // Initialize versioning fields for new chatflows
        if (!newChatFlow.id) {
            newChatFlow.currentVersion = 1
            newChatFlow.s3Location = `ChatFlows/${newChatFlow.id || 'temp'}/`
        }

        if (containsBase64File(newChatFlow)) {
            // we need a 2-step process, as we need to save the chatflow first and then update the file paths
            // this is because we need the chatflow id to create the file paths

            // Handle marketplace template IDs - capture as templateId before clearing parentChatflowId
            if (
                newChatFlow.parentChatflowId &&
                typeof newChatFlow.parentChatflowId === 'string' &&
                newChatFlow.parentChatflowId.startsWith('cf_')
            ) {
                // Store the template ID before clearing the parentChatflowId
                newChatFlow.templateId = newChatFlow.parentChatflowId
                newChatFlow.parentChatflowId = undefined
            }

            // step 1 - save with empty flowData
            const incomingFlowData = newChatFlow.flowData
            newChatFlow.flowData = JSON.stringify({})
            const chatflow = appServer.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
            const step1Results = await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)

            // step 2 - convert base64 to file paths and update the chatflow
            step1Results.flowData = await updateFlowDataWithFilePaths(step1Results.id, incomingFlowData)

            // Update S3 location with actual ID
            step1Results.s3Location = `ChatFlows/${step1Results.id}/`

            await _checkAndUpdateDocumentStoreUsage(step1Results)
            dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(step1Results)

            // Set initial version and save to S3 storage
            dbResponse.currentVersion = 1
            dbResponse.s3Location = `ChatFlows/${dbResponse.id}/`
            await appServer.AppDataSource.getRepository(ChatFlow).save(dbResponse)
            await chatflowStorageService.saveVersionedChatflow(dbResponse.id, dbResponse.currentVersion, dbResponse)
        } else {
            // Handle marketplace template IDs - capture as templateId before clearing parentChatflowId
            if (
                newChatFlow.parentChatflowId &&
                typeof newChatFlow.parentChatflowId === 'string' &&
                newChatFlow.parentChatflowId.startsWith('cf_')
            ) {
                // Store the template ID before clearing the parentChatflowId
                newChatFlow.templateId = newChatFlow.parentChatflowId
                newChatFlow.parentChatflowId = undefined
            }

            const chatflow = appServer.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
            dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)

            // Update S3 location with actual ID, set initial version and save to S3
            dbResponse.s3Location = `ChatFlows/${dbResponse.id}/`
            dbResponse.currentVersion = 1
            await appServer.AppDataSource.getRepository(ChatFlow).save(dbResponse)
            await chatflowStorageService.saveVersionedChatflow(dbResponse.id, dbResponse.currentVersion, dbResponse)
        }

        await appServer.telemetry.sendTelemetry('chatflow_created', {
            version: await getAppVersion(),
            chatflowId: dbResponse.id,
            flowGraph: getTelemetryFlowObj(JSON.parse(dbResponse.flowData)?.nodes, JSON.parse(dbResponse.flowData)?.edges)
        })
        appServer.metricsProvider?.incrementCounter(
            dbResponse?.type === 'MULTIAGENT' ? FLOWISE_METRIC_COUNTERS.AGENTFLOW_CREATED : FLOWISE_METRIC_COUNTERS.CHATFLOW_CREATED,
            { status: FLOWISE_COUNTER_STATUS.SUCCESS }
        )

        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.saveChatflow - ${getErrorMessage(error)}`
        )
    }
}

const importChatflows = async (user: IUser, newChatflows: Partial<ChatFlow>[], queryRunner?: QueryRunner): Promise<any> => {
    try {
        for (const data of newChatflows) {
            if (data.id && !validate(data.id)) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: importChatflows - invalid id!`)
            }
        }

        const appServer = getRunningExpressApp()
        const repository = queryRunner ? queryRunner.manager.getRepository(ChatFlow) : appServer.AppDataSource.getRepository(ChatFlow)

        // step 1 - check whether file chatflows array is zero
        if (newChatflows.length == 0) return

        // step 2 - check whether ids are duplicate in database
        let ids = '('
        let count: number = 0
        const lastCount = newChatflows.length - 1
        newChatflows.forEach((newChatflow) => {
            ids += `'${newChatflow.id}'`
            if (lastCount != count) ids += ','
            if (lastCount == count) ids += ')'
            count += 1
        })

        const selectResponse = await repository.createQueryBuilder('cf').select('cf.id').where(`cf.id IN ${ids}`).getMany()
        const foundIds = selectResponse.map((response) => {
            return response.id
        })

        // step 3 - remove ids that are only duplicate
        const prepChatflows: Partial<ChatFlow>[] = newChatflows.map((newChatflow) => {
            let id: string = ''
            if (newChatflow.id) id = newChatflow.id
            let flowData: string = ''
            if (newChatflow.flowData) flowData = newChatflow.flowData
            if (foundIds.includes(id)) {
                newChatflow.id = undefined
                newChatflow.name += ' (1)'
            }
            newChatflow.flowData = JSON.stringify(JSON.parse(flowData))
            newChatflow.userId = user?.id
            newChatflow.organizationId = user?.organizationId

            newChatflow.visibility = [ChatflowVisibility.PRIVATE]

            // Ensure chatFeedback is set to true by default
            if (newChatflow.chatbotConfig) {
                try {
                    const config = JSON.parse(newChatflow.chatbotConfig)
                    if (!config.chatFeedback) {
                        config.chatFeedback = { status: true }
                        newChatflow.chatbotConfig = JSON.stringify(config)
                    } else if (config.chatFeedback.status === undefined) {
                        config.chatFeedback.status = true
                        newChatflow.chatbotConfig = JSON.stringify(config)
                    }
                } catch (e) {
                    // If parsing fails, set a new config
                    newChatflow.chatbotConfig = JSON.stringify({ chatFeedback: { status: true } })
                }
            } else {
                // If no chatbotConfig, create one with chatFeedback enabled
                newChatflow.chatbotConfig = JSON.stringify({ chatFeedback: { status: true } })
            }

            return newChatflow
        })

        // step 4 - transactional insert array of entities
        const insertResponse = await repository.insert(prepChatflows)

        return insertResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.saveChatflows - ${getErrorMessage(error)}`
        )
    }
}

const updateChatflow = async (chatflow: ChatFlow, updateChatFlow: ChatFlow, user: IUser): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()

        if (updateChatFlow.flowData && containsBase64File(updateChatFlow)) {
            updateChatFlow.flowData = await updateFlowDataWithFilePaths(chatflow.id, updateChatFlow.flowData)
        }

        // Parse existing chatbotConfig or create a new object if it doesn't exist
        let existingChatbotConfig: Record<string, any> = {}
        if (chatflow.chatbotConfig) {
            try {
                existingChatbotConfig = JSON.parse(chatflow.chatbotConfig)
            } catch (e) {
                // If parsing fails, create a new object
                existingChatbotConfig = {}
                console.error(`Error parsing chatbotConfig for chatflow ${chatflow.id}:`, e)
            }
        }

        // If updateChatFlow has a chatbotConfig, merge it with existing
        if (updateChatFlow.chatbotConfig) {
            let updatedConfig: Record<string, any> = {}
            try {
                updatedConfig = JSON.parse(updateChatFlow.chatbotConfig)

                // Preserve displayMode and embeddedUrl which are handled specially
                if (updatedConfig?.displayMode !== undefined) {
                    existingChatbotConfig.displayMode = updatedConfig.displayMode
                }
                if (updatedConfig?.embeddedUrl !== undefined) {
                    existingChatbotConfig.embeddedUrl = updatedConfig.embeddedUrl
                }

                // Merge other properties from updated config
                Object.keys(updatedConfig).forEach((key) => {
                    if (key !== 'displayMode' && key !== 'embeddedUrl') {
                        existingChatbotConfig[key] = updatedConfig[key]
                    }
                })
            } catch (e) {
                console.error(`Error parsing updated chatbotConfig for chatflow ${chatflow.id}:`, e)
            }
        }

        // Ensure chatFeedback.status is set to true if it's undefined
        if (!existingChatbotConfig.chatFeedback) {
            existingChatbotConfig.chatFeedback = { status: true }
        } else if (existingChatbotConfig.chatFeedback.status === undefined) {
            existingChatbotConfig.chatFeedback.status = true
        }

        // Update the chatbotConfig in the chatflow object
        const updatedChatbotConfig = JSON.stringify(existingChatbotConfig)

        // Create a new object with all the properties from updateChatFlow
        // but override chatbotConfig with our version
        const mergedChatflow = {
            ...updateChatFlow,
            organizationId: user.organizationId,
            chatbotConfig: updatedChatbotConfig
        }

        if (updateChatFlow.visibility) {
            updateChatFlow.visibility = Array.from(new Set([...updateChatFlow.visibility, ChatflowVisibility.PRIVATE]))
        }

        const newDbChatflow = appServer.AppDataSource.getRepository(ChatFlow).merge(chatflow, mergedChatflow)

        await _checkAndUpdateDocumentStoreUsage(newDbChatflow)

        // Auto-increment version if flowData was updated
        if (updateChatFlow.flowData) {
            newDbChatflow.currentVersion = (newDbChatflow.currentVersion || 1) + 1
        }

        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(newDbChatflow)

        // Save new version to S3 if flowData was updated
        if (updateChatFlow.flowData) {
            // Create version record with the actual user who made the change
            const versionRecord = {
                ...dbResponse,
                // Override userId to track who actually made this change
                versionMetadata: {
                    originalUserId: dbResponse.userId, // Preserve original owner
                    editedByUserId: user.id, // Track who made this change
                    editedByName: user.name || 'Unknown User',
                    editedByEmail: user.email
                }
            }
            await chatflowStorageService.saveVersionedChatflow(dbResponse.id, dbResponse.currentVersion || 1, versionRecord)
        }

        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.updateChatflow - ${getErrorMessage(error)}`
        )
    }
}

// Get specific chatflow via id (PUBLIC endpoint, used when sharing chatbot link)
const getSinglePublicChatflow = async (chatflowId: string, user: IUser | undefined): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (dbResponse && (dbResponse.isPublic || (await checkOwnership(dbResponse, user)))) {
            return dbResponse
        } else if (dbResponse && !dbResponse.isPublic) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
    } catch (error) {
        if (error instanceof InternalFlowiseError && error.statusCode === StatusCodes.UNAUTHORIZED) {
            throw error
        } else {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Error: chatflowsService.getSinglePublicChatflow - ${getErrorMessage(error)}`
            )
        }
    }
}

// Get specific chatflow chatbotConfig via id (PUBLIC endpoint, used to retrieve config for embedded chat)
// Safe as public endpoint as chatbotConfig doesn't contain sensitive credential
const getSinglePublicChatbotConfig = async (chatflowId: string, user: IUser | undefined): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }
        if (dbResponse.isPublic || (await checkOwnership(dbResponse, user))) {
            const uploadsConfig = await utilGetUploadsConfig(chatflowId)
            // even if chatbotConfig is not set but uploads are enabled
            // send uploadsConfig to the chatbot
            if (dbResponse.chatbotConfig || uploadsConfig) {
                try {
                    const parsedConfig = dbResponse.chatbotConfig ? JSON.parse(dbResponse.chatbotConfig) : {}
                    return { ...parsedConfig, uploads: uploadsConfig, flowData: dbResponse.flowData }
                } catch (e) {
                    throw new InternalFlowiseError(
                        StatusCodes.INTERNAL_SERVER_ERROR,
                        `Error parsing Chatbot Config for Chatflow ${chatflowId}`
                    )
                }
            }
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getSinglePublicChatbotConfig - ${getErrorMessage(error)}`
        )
    }
}

const _checkAndUpdateDocumentStoreUsage = async (chatflow: ChatFlow) => {
    const parsedFlowData: IReactFlowObject = JSON.parse(chatflow.flowData)
    const nodes = parsedFlowData.nodes
    // from the nodes array find if there is a node with name == documentStore)
    const node = nodes.length > 0 && nodes.find((node) => node.data.name === 'documentStore')
    if (!node || !node.data || !node.data.inputs || node.data.inputs['selectedStore'] === undefined) {
        await documentStoreService.updateDocumentStoreUsage(chatflow.id, undefined)
    } else {
        await documentStoreService.updateDocumentStoreUsage(chatflow.id, node.data.inputs['selectedStore'])
    }
}

const upsertChat = async ({
    id,
    user,
    filters = {},
    prompt,
    chatflowChatId,
    chatflowId
}: {
    id?: string
    user?: IUser
    filters?: object
    prompt: string
    chatflowChatId: string
    chatflowId: string
}): Promise<Chat> => {
    try {
        const appServer = getRunningExpressApp()
        const chatRepository = appServer.AppDataSource.getRepository(Chat)

        const chatProperties = {
            id: chatflowChatId,
            title: prompt,
            chatflowChatId,
            filters,
            owner: { id: user?.id },
            organization: { id: user?.organizationId },
            chatflow: { id: chatflowId }
        }

        let chat: Chat | undefined
        if (chatflowChatId) {
            const existingChat = await chatRepository.findOneBy({ chatflowChatId })
            if (existingChat) chat = chatRepository.merge(existingChat, chatProperties)
        }
        if (!chat) {
            // Create new chat
            chat = chatRepository.create(chatProperties)
        }
        if (chat) {
            const updatedChat = await chatRepository.save(chat)
            return updatedChat
        } else {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chat ${id} not found`)
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: chatflowsService.upsertChat - ${getErrorMessage(error)}`)
    }
}

const getDefaultChatflowTemplate = async (user: IUser): Promise<{ id: string; name: string } | null> => {
    try {
        // Get the default template ID from environment variable
        const rawIds = process.env.INITIAL_CHATFLOW_IDS ?? ''
        const ids = rawIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)

        if (!ids.length) {
            return null
        }

        // Use the first ID as the default template
        const templateId = ids[0]

        const appServer = getRunningExpressApp()
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)

        // Get the template chatflow
        const template = await chatFlowRepository.findOne({
            where: { id: templateId },
            select: ['id', 'name']
        })

        return template ? { id: template.id, name: template.name } : null
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getDefaultChatflowTemplate - ${getErrorMessage(error)}`
        )
    }
}

const bulkUpdateChatflows = async (chatflowIds: string[], user: IUser): Promise<{ updated: number; errors: string[] }> => {
    try {
        const appServer = getRunningExpressApp()
        const { id: userId, organizationId } = user
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)

        // Get default template
        const defaultTemplate = await getDefaultChatflowTemplate(user)
        if (!defaultTemplate) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'No default template found')
        }

        // Get template chatflow with full data
        const templateChatflow = await chatFlowRepository.findOne({
            where: { id: defaultTemplate.id }
        })

        if (!templateChatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Template chatflow not found')
        }

        // Get target chatflows that belong to the admin's organization and are outdated
        const targetChatflows = await chatFlowRepository.find({
            where: {
                id: In(chatflowIds),
                organizationId,
                parentChatflowId: defaultTemplate.id
            }
        })

        if (targetChatflows.length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'No valid chatflows found for update')
        }

        const results = { updated: 0, errors: [] as string[] }
        const updatedChatflows: any[] = []

        // Use transaction for bulk updates
        const queryRunner = appServer.AppDataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            for (const targetChatflow of targetChatflows) {
                try {
                    // Create updated chatflow by copying template data but preserving key fields
                    const updatedChatflow = {
                        ...templateChatflow,
                        id: targetChatflow.id,
                        name: targetChatflow.name, // Preserve original name
                        description: targetChatflow.description, // Preserve original description
                        userId: targetChatflow.userId, // Preserve original owner
                        organizationId: targetChatflow.organizationId, // Preserve original organization
                        parentChatflowId: targetChatflow.parentChatflowId, // Preserve parent relationship
                        createdDate: targetChatflow.createdDate, // Preserve creation date
                        currentVersion: (targetChatflow.currentVersion || 1) + 1, // Increment version
                        s3Location: targetChatflow.s3Location || `ChatFlows/${targetChatflow.id}/`
                        // updatedDate will be set automatically by TypeORM
                    }

                    // Remove template-specific fields that shouldn't be copied
                    delete (updatedChatflow as any).templateId

                    const savedChatflow = await queryRunner.manager.save(ChatFlow, updatedChatflow)
                    updatedChatflows.push(savedChatflow)
                    results.updated++
                } catch (error) {
                    results.errors.push(`Failed to update chatflow ${targetChatflow.id}: ${getErrorMessage(error)}`)
                }
            }

            await queryRunner.commitTransaction()

            // Save updated chatflows to S3 storage after successful database transaction
            for (const chatflow of updatedChatflows) {
                try {
                    // Create version record with the admin who made the bulk update
                    const versionRecord = {
                        ...chatflow,
                        versionMetadata: {
                            originalUserId: chatflow.userId, // Preserve original owner
                            editedByUserId: user.id, // Track who made this change
                            editedByName: user.name || 'Unknown User',
                            editedByEmail: user.email
                        }
                    }
                    await chatflowStorageService.saveVersionedChatflow(chatflow.id, chatflow.currentVersion || 1, versionRecord)
                } catch (s3Error) {
                    // Log S3 errors but don't fail the entire operation
                    results.errors.push(`Failed to save chatflow ${chatflow.id} to S3: ${getErrorMessage(s3Error)}`)
                }
            }
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return results
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.bulkUpdateChatflows - ${getErrorMessage(error)}`
        )
    }
}

const getChatflowVersions = async (chatflowId: string, user: IUser): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)

        // Get the chatflow
        const chatflow = await chatFlowRepository.findOne({ where: { id: chatflowId } })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        // Check ownership
        if (!(await checkOwnership(chatflow, user))) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }

        // Get versions from S3
        const versions = await chatflowStorageService.listChatflowVersions(chatflowId)

        // Get user information for each version
        const userRepository = appServer.AppDataSource.getRepository('User')
        const versionsWithUserInfo = []

        for (const v of versions) {
            let userName = 'Unknown User'
            let userEmail = ''

            // Check for version metadata first (tracks who actually made the change)
            if (v.record && v.record.versionMetadata) {
                // Use the metadata if available (new format)
                userName = v.record.versionMetadata.editedByName || 'Unknown User'
                userEmail = v.record.versionMetadata.editedByEmail || ''
            } else if (v.record && v.record.userId) {
                // Fall back to original user lookup (backward compatibility)
                try {
                    const user = await userRepository.findOne({ where: { id: v.record.userId } })
                    if (user) {
                        userName = user.name || 'Unknown User'
                        userEmail = user.email || ''
                    }
                } catch (error) {
                    // If user lookup fails, use fallback
                    userName = 'Unknown User'
                }
            }

            versionsWithUserInfo.push({
                version: v.version,
                timestamp: v.timestamp,
                metadata: {
                    ...v.metadata,
                    // Include rollback information if available
                    isRollback: v.record?.versionMetadata?.isRollback,
                    rolledBackFromVersion: v.record?.versionMetadata?.rolledBackFromVersion
                },
                user: {
                    name: userName,
                    email: userEmail
                }
            })
        }

        return {
            chatflowId,
            currentVersion: chatflow.currentVersion,
            versions: versionsWithUserInfo
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getChatflowVersions - ${getErrorMessage(error)}`
        )
    }
}

const getChatflowVersion = async (chatflowId: string, version: number | undefined, user: IUser): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)

        // Get the chatflow
        const chatflow = await chatFlowRepository.findOne({ where: { id: chatflowId } })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        // Check ownership
        if (!(await checkOwnership(chatflow, user))) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }

        // Get specific version or published version from S3
        const flowData = await chatflowStorageService.getChatflowVersion(chatflowId, version)
        if (!flowData) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Version ${version || 'published'} not found`)
        }

        return {
            ...chatflow,
            flowData
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getChatflowVersion - ${getErrorMessage(error)}`
        )
    }
}

const rollbackChatflowToVersion = async (chatflowId: string, version: number, user: IUser): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)

        // Get the chatflow
        const chatflow = await chatFlowRepository.findOne({ where: { id: chatflowId } })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        // Check ownership
        if (!(await checkOwnership(chatflow, user))) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }

        // Rollback to specified version (this creates a new version with the rollback content)
        await chatflowStorageService.rollbackToVersion(chatflowId, version, user)

        // Update database with the new version number from rollback
        const newVersion = (chatflow.currentVersion || 1) + 1
        chatflow.currentVersion = newVersion

        const dbResponse = await chatFlowRepository.save(chatflow)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.rollbackChatflowToVersion - ${getErrorMessage(error)}`
        )
    }
}

const getChatflowForPrediction = async (chatflowId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)

        // Get the chatflow
        const chatflow = await chatFlowRepository.findOne({ where: { id: chatflowId } })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        // Get current version from S3 for production use
        const currentRecord = await chatflowStorageService.getChatflowVersion(chatflowId)
        if (currentRecord) {
            return currentRecord
        }

        // Fallback to database version if no version in S3
        return chatflow
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getChatflowForPrediction - ${getErrorMessage(error)}`
        )
    }
}

export default {
    checkIfChatflowIsValidForStreaming,
    checkIfChatflowIsValidForUploads,
    deleteChatflow,
    getAllChatflows,
    getAdminChatflows,
    getChatflowByApiKey,
    getChatflowById,
    saveChatflow,
    importChatflows,
    updateChatflow,
    getSinglePublicChatflow,
    getSinglePublicChatbotConfig,
    upsertChat,
    getDefaultChatflowTemplate,
    bulkUpdateChatflows,
    getChatflowVersions,
    getChatflowVersion,
    rollbackChatflowToVersion,
    getChatflowForPrediction
}
