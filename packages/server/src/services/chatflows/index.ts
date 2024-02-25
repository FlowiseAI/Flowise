import { FindOptionsWhere } from 'typeorm'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ICommonObject } from 'flowise-components'
import { IChatFlow, IReactFlowObject } from '../../Interface'
import { clearSessionMemory, constructGraphs, getEndingNodes, isFlowValidForStream } from '../../utils'
import { createRateLimiter } from '../../utils/rateLimit'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const chatflowValidForStreaming = async (chatflowId: string) => {
    try {
        const chatflow = await getSingleChatflow(chatflowId)
        //@ts-ignore
        if (typeof chatflow.executionError !== 'undefined') {
            return chatflow
        }
        /*** Get Ending Node with Directed Graph  ***/
        //@ts-ignore
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
        throw new Error(`Error: chatflowsService.chatflowValidForStreaming - ${error}`)
    }
}

// @ts-ignore
const createChatflow = async (reqBody) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const newChatFlow = new ChatFlow()
        Object.assign(newChatFlow, reqBody)
        const chatflow = await flowXpresApp.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).save(chatflow)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.createChatflow - ${error}`)
    }
}

const getAllChatFlows = async (): Promise<IChatFlow[]> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).find()
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.getAllChatFlows - ${error}`)
    }
}

const getSingleChatflowByApiKey = async (apiKey: ICommonObject) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow)
            .createQueryBuilder('cf')
            .where('cf.apikeyid = :apikeyid', { apikeyid: apiKey.id })
            .orWhere('cf.apikeyid IS NULL')
            .orWhere('cf.apikeyid = ""')
            .orderBy('cf.name', 'ASC')
            .getMany()
        if (dbResponse.length === 0) {
            return {
                executionError: true,
                status: 404,
                msg: `Chatflow not found`
            }
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.getSingleChatflowByApiKey - ${error}`)
    }
}

const getSingleChatflow = async (chatflowId: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).findOneBy({
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
        throw new Error(`Error: chatflowsService.getSingleChatflow - ${error}`)
    }
}

const removeAllChatMessages = async (
    chatflowid: string,
    chatId: string,
    chatType: string | undefined,
    isClearFromViewMessageDialog: string | undefined,
    memoryType: string | undefined,
    sessionId: string | undefined
) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        if (typeof chatflowid === 'undefined') {
            throw new Error(`Error: chatflowsService.removeAllChatMessages - chatflowid not found!`)
        }
        const chatflow = await getSingleChatflow(chatflowid)
        if (!chatflow) {
            return {
                executionError: true,
                status: 404,
                msg: `Error: chatflowsService.removeAllChatMessages - Chatflow ${chatflowid} not found`
            }
        }
        //@ts-ignore
        const flowData = chatflow.flowData
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const nodes = parsedFlowData.nodes
        try {
            await clearSessionMemory(
                nodes,
                flowXpresApp.nodesPool.componentNodes,
                chatId,
                flowXpresApp.AppDataSource,
                sessionId,
                memoryType,
                isClearFromViewMessageDialog
            )
        } catch (e) {
            return {
                executionError: true,
                status: 500,
                msg: `Error clearing chat messages`
            }
        }
        const deleteOptions: FindOptionsWhere<ChatMessage> = { chatflowid }
        if (chatId) deleteOptions.chatId = chatId
        if (memoryType) deleteOptions.memoryType = memoryType
        if (sessionId) deleteOptions.sessionId = sessionId
        if (chatType) deleteOptions.chatType = chatType
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatMessage).delete(deleteOptions)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.removeAllChatMessages - ${error}`)
    }
}

const removeSingleChatflow = async (chatflowId: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).delete({
            id: chatflowId
        })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.removeSingleChatflow - ${error}`)
    }
}

// @ts-ignore
const updateChatflow = async (chatflowId, requestBody) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const chatflow = await getSingleChatflow(chatflowId)
        if (!chatflow) {
            return {
                executionError: true,
                status: 404,
                msg: `Chatflow ${chatflowId} not found in the database!`
            }
        }
        const updateChatFlow = new ChatFlow()
        Object.assign(updateChatFlow, requestBody)
        //@ts-ignore
        updateChatFlow.id = chatflow.id
        createRateLimiter(updateChatFlow)
        //@ts-ignore
        await flowXpresApp.AppDataSource.getRepository(ChatFlow).merge(chatflow, updateChatFlow)
        //@ts-ignore
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatFlow).save(chatflow)
        // chatFlowPool is initialized only when a flow is opened
        // if the user attempts to rename/update category without opening any flow, chatFlowPool will be undefined
        if (flowXpresApp.chatflowPool) {
            // Update chatflowpool inSync to false, to build flow from scratch again because data has been changed
            //@ts-ignore
            flowXpresApp.chatflowPool.updateInSync(chatflow.id, false)
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatflowsService.updateChatflow - ${error}`)
    }
}

export default {
    chatflowValidForStreaming,
    createChatflow,
    getAllChatFlows,
    getSingleChatflowByApiKey,
    getSingleChatflow,
    removeAllChatMessages,
    removeSingleChatflow,
    updateChatflow
}
