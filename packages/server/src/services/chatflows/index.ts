import { removeFolderFromStorage } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { ChatflowType, IReactFlowObject } from '../../Interface'
import { ChatFlow } from '../../database/entities/ChatFlow'
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

const deleteChatflow = async (chatflowId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).delete({ id: chatflowId })
        try {
            // Delete all uploads corresponding to this chatflow
            await removeFolderFromStorage(chatflowId)
            await documentStoreService.updateDocumentStoreUsage(chatflowId, undefined)

            // Delete all chat messages
            await appServer.AppDataSource.getRepository(ChatMessage).delete({ chatflowid: chatflowId })

            // Delete all chat feedback
            await appServer.AppDataSource.getRepository(ChatMessageFeedback).delete({ chatflowid: chatflowId })

            // Delete all upsert history
            await appServer.AppDataSource.getRepository(UpsertHistory).delete({ chatflowid: chatflowId })
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

const getAllChatflows = async (type?: ChatflowType): Promise<ChatFlow[]> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).find()
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

const getChatflowById = async (chatflowId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found in the database!`)
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
        if (containsBase64File(newChatFlow)) {
            // we need a 2-step process, as we need to save the chatflow first and then update the file paths
            // this is because we need the chatflow id to create the file paths

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
            const chatflow = appServer.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
            dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)
        }
        await appServer.telemetry.sendTelemetry('chatflow_created', {
            version: await getAppVersion(),
            chatflowId: dbResponse.id,
            flowGraph: getTelemetryFlowObj(JSON.parse(dbResponse.flowData)?.nodes, JSON.parse(dbResponse.flowData)?.edges)
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.saveChatflow - ${getErrorMessage(error)}`
        )
    }
}

const importChatflows = async (newChatflows: Partial<ChatFlow>[]): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()

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

        const selectResponse = await appServer.AppDataSource.getRepository(ChatFlow)
            .createQueryBuilder('cf')
            .select('cf.id')
            .where(`cf.id IN ${ids}`)
            .getMany()
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
            return newChatflow
        })

        // step 4 - transactional insert array of entities
        const insertResponse = await appServer.AppDataSource.getRepository(ChatFlow).insert(prepChatflows)

        return insertResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.saveChatflows - ${getErrorMessage(error)}`
        )
    }
}

const updateChatflow = async (chatflow: ChatFlow, updateChatFlow: ChatFlow): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        if (updateChatFlow.flowData && containsBase64File(updateChatFlow)) {
            updateChatFlow.flowData = await updateFlowDataWithFilePaths(chatflow.id, updateChatFlow.flowData)
        }
        const newDbChatflow = appServer.AppDataSource.getRepository(ChatFlow).merge(chatflow, updateChatFlow)
        await _checkAndUpdateDocumentStoreUsage(newDbChatflow)
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(newDbChatflow)

        // chatFlowPool is initialized only when a flow is opened
        // if the user attempts to rename/update category without opening any flow, chatFlowPool will be undefined
        if (appServer.chatflowPool) {
            // Update chatflowpool inSync to false, to build flow from scratch again because data has been changed
            appServer.chatflowPool.updateInSync(chatflow.id, false)
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
const getSinglePublicChatflow = async (chatflowId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (dbResponse && dbResponse.isPublic) {
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
const getSinglePublicChatbotConfig = async (chatflowId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }
        const uploadsConfig = await utilGetUploadsConfig(chatflowId)
        // even if chatbotConfig is not set but uploads are enabled
        // send uploadsConfig to the chatbot
        if (dbResponse.chatbotConfig || uploadsConfig) {
            try {
                const parsedConfig = dbResponse.chatbotConfig ? JSON.parse(dbResponse.chatbotConfig) : {}
                return { ...parsedConfig, uploads: uploadsConfig }
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
    getSinglePublicChatbotConfig
}
