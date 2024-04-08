import path from 'path'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { IChatFlow } from '../../Interface'
import { ChatFlow } from '../../database/entities/ChatFlow'
import {
    getAppVersion,
    getTelemetryFlowObj,
    deleteFolderRecursive,
    isFlowValidForStream,
    constructGraphs,
    getEndingNodes
} from '../../utils'
import logger from '../../utils/logger'
import { getStoragePath } from 'flowise-components'
import { IReactFlowObject } from '../../Interface'
import { utilGetUploadsConfig } from '../../utils/getUploadsConfig'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { UpsertHistory } from '../../database/entities/UpsertHistory'
import { containsBase64File, updateFlowDataWithFilePaths } from '../../utils/fileRepository'

// Check if chatflow valid for streaming
const checkIfChatflowIsValidForStreaming = async (chatflowId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        //**
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (!chatflow) {
            return {
                executionError: true,
                status: 404,
                msg: `Chatflow ${chatflowId} not found`
            }
        }

        /*** Get Ending Node with Directed Graph  ***/
        const flowData = chatflow.flowData
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const nodes = parsedFlowData.nodes
        const edges = parsedFlowData.edges
        const { graph, nodeDependencies } = constructGraphs(nodes, edges)

        const endingNodeIds = getEndingNodes(nodeDependencies, graph)
        if (!endingNodeIds.length) {
            return {
                executionError: true,
                status: 500,
                msg: `Ending nodes not found`
            }
        }

        const endingNodes = nodes.filter((nd) => endingNodeIds.includes(nd.id))

        let isStreaming = false
        let isEndingNodeExists = endingNodes.find((node) => node.data?.outputs?.output === 'EndingNode')

        for (const endingNode of endingNodes) {
            const endingNodeData = endingNode.data
            if (!endingNodeData) {
                return {
                    executionError: true,
                    status: 500,
                    msg: `Ending node ${endingNode.id} data not found`
                }
            }

            const isEndingNode = endingNodeData?.outputs?.output === 'EndingNode'

            if (!isEndingNode) {
                if (
                    endingNodeData &&
                    endingNodeData.category !== 'Chains' &&
                    endingNodeData.category !== 'Agents' &&
                    endingNodeData.category !== 'Engine'
                ) {
                    return {
                        executionError: true,
                        status: 500,
                        msg: `Ending node must be either a Chain or Agent`
                    }
                }
            }

            isStreaming = isEndingNode ? false : isFlowValidForStream(nodes, endingNodeData)
        }

        // Once custom function ending node exists, flow is always unavailable to stream
        const dbResponse = { isStreaming: isEndingNodeExists ? false : isStreaming }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.checkIfChatflowIsValidForStreaming - ${error}`)
    }
}

// Check if chatflow valid for uploads
const checkIfChatflowIsValidForUploads = async (chatflowId: string): Promise<any> => {
    try {
        const dbResponse = await utilGetUploadsConfig(chatflowId)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.checkIfChatflowIsValidForUploads - ${error}`)
    }
}

const deleteChatflow = async (chatflowId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).delete({ id: chatflowId })
        try {
            // Delete all uploads corresponding to this chatflow
            const directory = path.join(getStoragePath(), chatflowId)
            deleteFolderRecursive(directory)

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
        throw new Error(`Error: chatflowsService.getAllChatflows - ${error}`)
    }
}

const getAllChatflows = async (): Promise<IChatFlow[]> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).find()
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.getAllChatflows - ${error}`)
    }
}

const getChatflowByApiKey = async (apiKeyId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow)
            .createQueryBuilder('cf')
            .where('cf.apikeyid = :apikeyid', { apikeyid: apiKeyId })
            .orWhere('cf.apikeyid IS NULL')
            .orWhere('cf.apikeyid = ""')
            .orderBy('cf.name', 'ASC')
            .getMany()
        if (dbResponse.length < 1) {
            return {
                executionError: true,
                status: 404,
                msg: `Chatflow not found in the database!`
            }
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.getChatflowByApiKey - ${error}`)
    }
}

const getChatflowById = async (chatflowId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (!dbResponse) {
            return {
                executionError: true,
                status: 404,
                msg: `Chatflow ${chatflowId} not found in the database!`
            }
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.getAllChatflows - ${error}`)
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
            step1Results.flowData = updateFlowDataWithFilePaths(step1Results.id, incomingFlowData)
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
        throw new Error(`Error: chatflowsService.saveChatflow - ${error}`)
    }
}

const updateChatflow = async (chatflow: ChatFlow, updateChatFlow: ChatFlow): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        if (updateChatFlow.flowData && containsBase64File(updateChatFlow)) {
            updateChatFlow.flowData = updateFlowDataWithFilePaths(chatflow.id, updateChatFlow.flowData)
        }
        const newDbChatflow = appServer.AppDataSource.getRepository(ChatFlow).merge(chatflow, updateChatFlow)
        const dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(newDbChatflow)

        // chatFlowPool is initialized only when a flow is opened
        // if the user attempts to rename/update category without opening any flow, chatFlowPool will be undefined
        if (appServer.chatflowPool) {
            // Update chatflowpool inSync to false, to build flow from scratch again because data has been changed
            appServer.chatflowPool.updateInSync(chatflow.id, false)
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.updateChatflow - ${error}`)
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
            return {
                executionError: true,
                status: 401,
                msg: `Unauthorized`
            }
        }
        return {
            executionError: true,
            status: 404,
            msg: `Chatflow ${chatflowId} not found`
        }
    } catch (error) {
        throw new Error(`Error: chatflowsService.getSinglePublicChatflow - ${error}`)
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
            return {
                executionError: true,
                status: 404,
                msg: `Chatflow ${chatflowId} not found`
            }
        }
        const uploadsConfig = await utilGetUploadsConfig(chatflowId)
        // even if chatbotConfig is not set but uploads are enabled
        // send uploadsConfig to the chatbot
        if (dbResponse.chatbotConfig || uploadsConfig) {
            try {
                const parsedConfig = dbResponse.chatbotConfig ? JSON.parse(dbResponse.chatbotConfig) : {}
                return { ...parsedConfig, uploads: uploadsConfig }
            } catch (e) {
                return {
                    executionError: true,
                    status: 500,
                    msg: `Error parsing Chatbot Config for Chatflow ${chatflowId}`
                }
            }
        }
        return 'OK'
    } catch (error) {
        throw new Error(`Error: chatflowsService.getSinglePublicChatbotConfig - ${error}`)
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
    updateChatflow,
    getSinglePublicChatflow,
    getSinglePublicChatbotConfig
}
