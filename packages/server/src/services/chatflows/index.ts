import { ICommonObject, removeFolderFromStorage } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { ChatflowType, IReactFlowObject, IUser } from '../../Interface'
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
import checkOwnership from '../../utils/checkOwnership'
import { Organization } from '../../database/entities/Organization'
import { Chat } from '../../database/entities/Chat'
import { FLOWISE_METRIC_COUNTERS, FLOWISE_COUNTER_STATUS } from '../../Interface.Metrics'
import { IsNull, QueryRunner } from 'typeorm'

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
        const { id: userId, organizationId, permissions } = user ?? {}

        // First, try to find the chatflow
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: {
                id: chatflowId,
                ...(permissions?.includes('org:manage') ? [{ organizationId }, { organizationId: IsNull() }] : { userId, organizationId })
            }
        })

        if (!chatflow) {
            return { affected: 0, message: 'Chatflow not found' }
        }

        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).softDelete({ id: chatflowId, organizationId })

        try {
            // Delete all uploads corresponding to this chatflow
            await removeFolderFromStorage(chatflowId)
            await documentStoreService.updateDocumentStoreUsage(chatflowId, undefined)
            // Delete all chat messages
            await appServer.AppDataSource.getRepository(ChatMessage).softDelete({ chatflowid: chatflowId })
            // Delete all chat feedback
            await appServer.AppDataSource.getRepository(ChatMessageFeedback).softDelete({ chatflowid: chatflowId })
            // Delete all upsert history
            await appServer.AppDataSource.getRepository(UpsertHistory).softDelete({ chatflowid: chatflowId })
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
}
const getAllChatflows = async (type?: ChatflowType, filter?: ChatflowsFilter, user?: IUser): Promise<ChatFlow[]> => {
    try {
        const appServer = getRunningExpressApp()
        const { id: userId, organizationId, permissions } = user ?? {}
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)
        const queryBuilder = chatFlowRepository.createQueryBuilder('chatFlow')
        let org
        if (filter?.auth0_org_id) {
            org = await appServer.AppDataSource.getRepository(Organization).findOne({
                where: {
                    auth0Id: filter.auth0_org_id
                }
            })
        }
        if (filter?.visibility) {
            const visibilityConditions = filter.visibility
                .split(',')
                .map((v: string) => (v === 'Organization' ? 'Private' : v))
                .map((v: string) => `chatFlow.visibility LIKE '%${v.trim()}%'`)
                .join(' AND ')

            if (permissions?.includes('org:manage')) {
                queryBuilder.where(`(${visibilityConditions})`)
            } else {
                queryBuilder.where(`(chatFlow.userId = :userId AND (${visibilityConditions}))`, {
                    userId
                })
            }

            const visibility = filter.visibility
                .split(',')
                .map((v: string) => `chatFlow.visibility LIKE '%${v.trim()}%'`)
                .join(' AND ')
            if (filter.visibility.includes('Organization')) {
                const orgCondition = `chatFlow.organizationId = :organizationId AND (${visibility})`
                queryBuilder.orWhere(`(${orgCondition})`, { organizationId: org?.id ?? organizationId })
            }
        } else {
            if (!permissions?.includes('org:manage')) {
                queryBuilder.where(`chatFlow.userId = :userId`, { userId })
            }
        }

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

const getChatflowById = async (chatflowId: string, user?: IUser): Promise<any> => {
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

        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getChatflowById - ${getErrorMessage(error)}`
        )
    }
}

const saveChatflow = async (newChatFlow: ChatFlow): Promise<any> => {
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
        newChatFlow.visibility = Array.from(
            new Set([...(newChatFlow.visibility ?? []), ChatflowVisibility.PRIVATE, ChatflowVisibility.ANSWERAI])
        )
        if (containsBase64File(newChatFlow)) {
            // we need a 2-step process, as we need to save the chatflow first and then update the file paths
            // this is because we need the chatflow id to create the file paths

            // Ensure parentChatflowId is not a marketplace template ID
            if (
                newChatFlow.parentChatflowId &&
                typeof newChatFlow.parentChatflowId === 'string' &&
                newChatFlow.parentChatflowId.startsWith('cf_')
            ) {
                newChatFlow.parentChatflowId = undefined
            }

            // step 1 - save with empty flowData
            const incomingFlowData = newChatFlow.flowData
            newChatFlow.flowData = JSON.stringify({})
            const chatflow = appServer.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
            const step1Results = await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)

            // step 2 - convert base64 to file paths and update the chatflow
            step1Results.flowData = await updateFlowDataWithFilePaths(step1Results.id, incomingFlowData)
            await _checkAndUpdateDocumentStoreUsage(step1Results)
            dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(step1Results)
        } else {
            // Ensure parentChatflowId is not a marketplace template ID
            if (
                newChatFlow.parentChatflowId &&
                typeof newChatFlow.parentChatflowId === 'string' &&
                newChatFlow.parentChatflowId.startsWith('cf_')
            ) {
                newChatFlow.parentChatflowId = undefined
            }

            const chatflow = appServer.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
            dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)
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

        updateChatFlow.visibility = Array.from(
            new Set([...(updateChatFlow.visibility ?? []), ChatflowVisibility.PRIVATE, ChatflowVisibility.ANSWERAI])
        )

        const newDbChatflow = appServer.AppDataSource.getRepository(ChatFlow).merge(chatflow, mergedChatflow)

        await _checkAndUpdateDocumentStoreUsage(newDbChatflow)

        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(newDbChatflow)

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
                    return { ...parsedConfig, uploads: uploadsConfig }
                } catch (e) {
                    throw new InternalFlowiseError(
                        StatusCodes.INTERNAL_SERVER_ERROR,
                        `Error parsing Chatbot Config for Chatflow ${chatflowId}`
                    )
                }
            }
            return 'OK'
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

export default {
    checkIfChatflowIsValidForStreaming,
    checkIfChatflowIsValidForUploads,
    deleteChatflow,
    getAllChatflows,
    getChatflowByApiKey,
    getChatflowById,
    saveChatflow,
    importChatflows,
    updateChatflow,
    getSinglePublicChatflow,
    getSinglePublicChatbotConfig,
    upsertChat
}
