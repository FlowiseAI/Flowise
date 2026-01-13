import { ICommonObject, removeFolderFromStorage } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { In } from 'typeorm'
import { ChatflowType, IReactFlowObject } from '../../Interface'
import { FLOWISE_COUNTER_STATUS, FLOWISE_METRIC_COUNTERS } from '../../Interface.Metrics'
import { UsageCacheManager } from '../../UsageCacheManager'
import { ChatFlow, EnumChatflowType } from '../../database/entities/ChatFlow'
import { ChatFlowMaster } from '../../database/entities/ChatFlowMaster'
import { ChatFlowVersion } from '../../database/entities/ChatFlowVersion'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { UpsertHistory } from '../../database/entities/UpsertHistory'
import { Workspace } from '../../enterprise/database/entities/workspace.entity'
import { getWorkspaceSearchOptions } from '../../enterprise/utils/ControllerServiceUtils'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import documentStoreService from '../../services/documentstore'
import { constructGraphs, getAppVersion, getEndingNodes, getTelemetryFlowObj, isFlowValidForStream } from '../../utils'
import { containsBase64File, updateFlowDataWithFilePaths } from '../../utils/fileRepository'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { utilGetUploadsConfig } from '../../utils/getUploadsConfig'
import logger from '../../utils/logger'
import { updateStorageUsage } from '../../utils/quotaUsage'

export const enum ChatflowErrorMessage {
    INVALID_CHATFLOW_TYPE = 'Invalid Chatflow Type'
}

export function validateChatflowType(type: ChatflowType | undefined) {
    if (!Object.values(EnumChatflowType).includes(type as EnumChatflowType))
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, ChatflowErrorMessage.INVALID_CHATFLOW_TYPE)
}

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

        // Get the active version's data
        const activeVersion = await appServer.AppDataSource.getRepository(ChatFlowVersion).findOne({
            where: { masterId: chatflowId, isActive: true }
        })
        if (activeVersion) {
            chatflow.flowData = activeVersion.flowData
            if (activeVersion.chatbotConfig !== undefined) chatflow.chatbotConfig = activeVersion.chatbotConfig
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

const deleteChatflow = async (chatflowId: string, orgId: string, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()

        await getChatflowById(chatflowId, workspaceId)

        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).delete({ id: chatflowId })

        // Update document store usage
        await documentStoreService.updateDocumentStoreUsage(chatflowId, undefined, workspaceId)

        // Delete all chat messages
        await appServer.AppDataSource.getRepository(ChatMessage).delete({ chatflowid: chatflowId })

        // Delete all chat feedback
        await appServer.AppDataSource.getRepository(ChatMessageFeedback).delete({ chatflowid: chatflowId })

        // Delete all upsert history
        await appServer.AppDataSource.getRepository(UpsertHistory).delete({ chatflowid: chatflowId })

        try {
            // Delete all uploads corresponding to this chatflow
            const { totalSize } = await removeFolderFromStorage(orgId, chatflowId)
            await updateStorageUsage(orgId, workspaceId, totalSize, appServer.usageCacheManager)
        } catch (e) {
            logger.error(`[server]: Error deleting file storage for chatflow ${chatflowId}`)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.deleteChatflow - ${getErrorMessage(error)}`
        )
    }
}

const getAllChatflows = async (type?: ChatflowType, workspaceId?: string, page: number = -1, limit: number = -1) => {
    try {
        const appServer = getRunningExpressApp()

        const queryBuilder = appServer.AppDataSource.getRepository(ChatFlow)
            .createQueryBuilder('chat_flow')
            .orderBy('chat_flow.updatedDate', 'DESC')

        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }
        if (type === 'MULTIAGENT') {
            queryBuilder.andWhere('chat_flow.type = :type', { type: 'MULTIAGENT' })
        } else if (type === 'AGENTFLOW') {
            queryBuilder.andWhere('chat_flow.type = :type', { type: 'AGENTFLOW' })
        } else if (type === 'ASSISTANT') {
            queryBuilder.andWhere('chat_flow.type = :type', { type: 'ASSISTANT' })
        } else if (type === 'CHATFLOW') {
            // fetch all chatflows that are not agentflow
            queryBuilder.andWhere('chat_flow.type = :type', { type: 'CHATFLOW' })
        }
        if (workspaceId) queryBuilder.andWhere('chat_flow.workspaceId = :workspaceId', { workspaceId })
        const [data, total] = await queryBuilder.getManyAndCount()

        // Merge active version data for each chatflow
        const chatflowIds = data.map((cf) => cf.id)
        if (chatflowIds.length > 0) {
            const activeVersions = await appServer.AppDataSource.getRepository(ChatFlowVersion).find({
                where: { masterId: In(chatflowIds), isActive: true }
            })
            const versionMap = new Map(activeVersions.map((v) => [v.masterId, v]))
            for (const chatflow of data) {
                const activeVersion = versionMap.get(chatflow.id)
                if (activeVersion) {
                    chatflow.flowData = activeVersion.flowData
                    if (activeVersion.apikeyid !== undefined) chatflow.apikeyid = activeVersion.apikeyid
                    if (activeVersion.chatbotConfig !== undefined) chatflow.chatbotConfig = activeVersion.chatbotConfig
                    if (activeVersion.apiConfig !== undefined) chatflow.apiConfig = activeVersion.apiConfig
                    if (activeVersion.analytic !== undefined) chatflow.analytic = activeVersion.analytic
                    if (activeVersion.speechToText !== undefined) chatflow.speechToText = activeVersion.speechToText
                    if (activeVersion.followUpPrompts !== undefined) chatflow.followUpPrompts = activeVersion.followUpPrompts
                }
            }
        }

        if (page > 0 && limit > 0) {
            return { data, total }
        } else {
            return data
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getAllChatflows - ${getErrorMessage(error)}`
        )
    }
}

async function getAllChatflowsCountByOrganization(type: ChatflowType, organizationId: string): Promise<number> {
    try {
        const appServer = getRunningExpressApp()

        const workspaces = await appServer.AppDataSource.getRepository(Workspace).findBy({ organizationId })
        const workspaceIds = workspaces.map((workspace) => workspace.id)
        const chatflowsCount = await appServer.AppDataSource.getRepository(ChatFlow).countBy({
            type,
            workspaceId: In(workspaceIds)
        })

        return chatflowsCount
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getAllChatflowsCountByOrganization - ${getErrorMessage(error)}`
        )
    }
}

const getAllChatflowsCount = async (type?: ChatflowType, workspaceId?: string): Promise<number> => {
    try {
        const appServer = getRunningExpressApp()
        if (type) {
            const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).countBy({
                type,
                ...getWorkspaceSearchOptions(workspaceId)
            })
            return dbResponse
        }
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).countBy(getWorkspaceSearchOptions(workspaceId))
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getAllChatflowsCount - ${getErrorMessage(error)}`
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

const getChatflowById = async (chatflowId: string, workspaceId?: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: {
                id: chatflowId,
                ...(workspaceId ? { workspaceId } : {})
            }
        })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found in the database!`)
        }

        // Try to get the active version's data to ensure we have the latest flowData
        const activeVersion = await appServer.AppDataSource.getRepository(ChatFlowVersion).findOne({
            where: {
                masterId: chatflowId,
                isActive: true
            }
        })

        // If active version exists, merge its data with the chatflow response
        if (activeVersion) {
            dbResponse.flowData = activeVersion.flowData
            if (activeVersion.apikeyid !== undefined) dbResponse.apikeyid = activeVersion.apikeyid
            if (activeVersion.chatbotConfig !== undefined) dbResponse.chatbotConfig = activeVersion.chatbotConfig
            if (activeVersion.apiConfig !== undefined) dbResponse.apiConfig = activeVersion.apiConfig
            if (activeVersion.analytic !== undefined) dbResponse.analytic = activeVersion.analytic
            if (activeVersion.speechToText !== undefined) dbResponse.speechToText = activeVersion.speechToText
            if (activeVersion.followUpPrompts !== undefined) dbResponse.followUpPrompts = activeVersion.followUpPrompts
        }

        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getChatflowById - ${getErrorMessage(error)}`
        )
    }
}

const saveChatflow = async (
    newChatFlow: ChatFlow,
    orgId: string,
    workspaceId: string,
    subscriptionId: string,
    usageCacheManager: UsageCacheManager
): Promise<any> => {
    validateChatflowType(newChatFlow.type)
    const appServer = getRunningExpressApp()

    let dbResponse: ChatFlow
    if (containsBase64File(newChatFlow)) {
        // we need a 2-step process, as we need to save the chatflow first and then update the file paths
        // this is because we need the chatflow id to create the file paths

        // step 1 - save with empty flowData
        const incomingFlowData = newChatFlow.flowData
        newChatFlow.flowData = JSON.stringify({})
        const chatflow = appServer.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
        const step1Results = await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)

        // step 2 - convert base64 to file paths and update the chatflow
        step1Results.flowData = await updateFlowDataWithFilePaths(
            step1Results.id,
            incomingFlowData,
            orgId,
            workspaceId,
            subscriptionId,
            usageCacheManager
        )
        await _checkAndUpdateDocumentStoreUsage(step1Results, newChatFlow.workspaceId)
        dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(step1Results)
    } else {
        const chatflow = appServer.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
        dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)
    }

    // Create ChatFlowMaster and initial ChatFlowVersion for versioning support
    const chatFlowMaster = appServer.AppDataSource.getRepository(ChatFlowMaster).create({
        id: dbResponse.id, // Use the same ID as the ChatFlow for consistency
        name: dbResponse.name,
        type: dbResponse.type,
        workspaceId: dbResponse.workspaceId,
        category: dbResponse.category,
        isPublic: dbResponse.isPublic
    })
    await appServer.AppDataSource.getRepository(ChatFlowMaster).save(chatFlowMaster)

    // Create initial version (version 1, active)
    const initialVersion = appServer.AppDataSource.getRepository(ChatFlowVersion).create({
        masterId: dbResponse.id,
        version: 1,
        isActive: true,
        flowData: dbResponse.flowData,
        apikeyid: dbResponse.apikeyid,
        chatbotConfig: dbResponse.chatbotConfig,
        apiConfig: dbResponse.apiConfig,
        analytic: dbResponse.analytic,
        speechToText: dbResponse.speechToText,
        followUpPrompts: dbResponse.followUpPrompts,
        changeDescription: 'Initial version',
        sourceVersion: undefined,
        createdBy: undefined
    })
    await appServer.AppDataSource.getRepository(ChatFlowVersion).save(initialVersion)

    const productId = await appServer.identityManager.getProductIdFromSubscription(subscriptionId)

    await appServer.telemetry.sendTelemetry(
        'chatflow_created',
        {
            version: await getAppVersion(),
            chatflowId: dbResponse.id,
            flowGraph: getTelemetryFlowObj(JSON.parse(dbResponse.flowData)?.nodes, JSON.parse(dbResponse.flowData)?.edges),
            productId,
            subscriptionId
        },
        orgId
    )

    appServer.metricsProvider?.incrementCounter(
        dbResponse?.type === 'MULTIAGENT' ? FLOWISE_METRIC_COUNTERS.AGENTFLOW_CREATED : FLOWISE_METRIC_COUNTERS.CHATFLOW_CREATED,
        { status: FLOWISE_COUNTER_STATUS.SUCCESS }
    )

    return dbResponse
}

const updateChatflow = async (
    chatflow: ChatFlow,
    updateChatFlow: ChatFlow,
    orgId: string,
    workspaceId: string,
    subscriptionId: string
): Promise<any> => {
    const appServer = getRunningExpressApp()
    if (updateChatFlow.flowData && containsBase64File(updateChatFlow)) {
        updateChatFlow.flowData = await updateFlowDataWithFilePaths(
            chatflow.id,
            updateChatFlow.flowData,
            orgId,
            workspaceId,
            subscriptionId,
            appServer.usageCacheManager
        )
    }
    if (updateChatFlow.type || updateChatFlow.type === '') {
        validateChatflowType(updateChatFlow.type)
    } else {
        updateChatFlow.type = chatflow.type
    }
    const newDbChatflow = appServer.AppDataSource.getRepository(ChatFlow).merge(chatflow, updateChatFlow)
    await _checkAndUpdateDocumentStoreUsage(newDbChatflow, chatflow.workspaceId)
    const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(newDbChatflow)

    return dbResponse
}

// Get specific chatflow chatbotConfig via id (PUBLIC endpoint, used to retrieve config for embedded chat)
// Safe as public endpoint as chatbotConfig doesn't contain sensitive credential
const getSinglePublicChatbotConfig = async (chatflowId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        // Get the active version's data
        const activeVersion = await appServer.AppDataSource.getRepository(ChatFlowVersion).findOne({
            where: { masterId: chatflowId, isActive: true }
        })
        if (activeVersion) {
            dbResponse.flowData = activeVersion.flowData
            if (activeVersion.chatbotConfig !== undefined) dbResponse.chatbotConfig = activeVersion.chatbotConfig
            if (activeVersion.textToSpeech !== undefined) dbResponse.textToSpeech = activeVersion.textToSpeech
        }

        const uploadsConfig = await utilGetUploadsConfig(chatflowId)
        // even if chatbotConfig is not set but uploads are enabled
        // send uploadsConfig to the chatbot
        if (dbResponse.chatbotConfig || uploadsConfig) {
            try {
                const parsedConfig = dbResponse.chatbotConfig ? JSON.parse(dbResponse.chatbotConfig) : {}
                const ttsConfig =
                    typeof dbResponse.textToSpeech === 'string' ? JSON.parse(dbResponse.textToSpeech) : dbResponse.textToSpeech

                let isTTSEnabled = false
                if (ttsConfig) {
                    Object.keys(ttsConfig).forEach((provider) => {
                        if (provider !== 'none' && ttsConfig?.[provider]?.status) {
                            isTTSEnabled = true
                        }
                    })
                }
                delete parsedConfig.allowedOrigins
                delete parsedConfig.allowedOriginsError
                return { ...parsedConfig, uploads: uploadsConfig, flowData: dbResponse.flowData, isTTSEnabled }
            } catch (e) {
                throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error parsing Chatbot Config for Chatflow ${chatflowId}`)
            }
        }
        return 'OK'
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.getSinglePublicChatbotConfig - ${getErrorMessage(error)}`
        )
    }
}

const _checkAndUpdateDocumentStoreUsage = async (chatflow: ChatFlow, workspaceId?: string) => {
    const parsedFlowData: IReactFlowObject = JSON.parse(chatflow.flowData)
    const nodes = parsedFlowData.nodes
    // from the nodes array find if there is a node with name == documentStore)
    const node = nodes.length > 0 && nodes.find((node) => node.data.name === 'documentStore')
    if (!node || !node.data || !node.data.inputs || node.data.inputs['selectedStore'] === undefined) {
        await documentStoreService.updateDocumentStoreUsage(chatflow.id, undefined, workspaceId)
    } else {
        await documentStoreService.updateDocumentStoreUsage(chatflow.id, node.data.inputs['selectedStore'], workspaceId)
    }
}

const checkIfChatflowHasChanged = async (chatflowId: string, lastUpdatedDateTime: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        //**
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }
        // parse the lastUpdatedDateTime as a date and
        //check if the updatedDate is the same as the lastUpdatedDateTime
        return { hasChanged: chatflow.updatedDate.toISOString() !== lastUpdatedDateTime }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.checkIfChatflowHasChanged - ${getErrorMessage(error)}`
        )
    }
}

export default {
    checkIfChatflowIsValidForStreaming,
    checkIfChatflowIsValidForUploads,
    deleteChatflow,
    getAllChatflows,
    getAllChatflowsCount,
    getChatflowByApiKey,
    getChatflowById,
    saveChatflow,
    updateChatflow,
    getSinglePublicChatbotConfig,
    checkIfChatflowHasChanged,
    getAllChatflowsCountByOrganization
}
