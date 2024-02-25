import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'
import { Request, Response } from 'express'
import logger from '../utils/logger'
import { IncomingInput, INodeData, IReactFlowObject, IChatMessage, chatType, IReactFlowNode, IDepthQueue } from '../Interface'
import telemetryService from '../services/telemetry'
import { ChatFlow } from '../database/entities/ChatFlow'
import { validateKey } from '../utils/validateKey'
import { addChatMessage } from '../utils/addChatMesage'
import { ICommonObject, IMessage } from 'flowise-components'
import {
    mapMimeTypeToInputField,
    getStartingNodes,
    findMemoryNode,
    getMemorySessionId,
    isFlowValidForStream,
    buildFlow,
    resolveVariables,
    getTelemetryFlowObj,
    isStartNodeDependOnInput,
    replaceInputsWithConfig,
    getAppVersion,
    getSessionChatHistory,
    databaseEntities,
    constructGraphs,
    getEndingNodes,
    isSameOverrideConfig
} from '../utils'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'

/**
 * Build Chatflow
 * @param {Request} req
 * @param {Response} res
 * @param {Server} socketIO
 * @param {boolean} isInternal
 * @param {boolean} isUpsert
 */
//@ts-ignore
export const buildChatflow = async (req: Request, res: Response, socketIO?: Server, isInternal: boolean = false) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const chatflowid = req.params.id
        let incomingInput: IncomingInput = req.body

        let nodeToExecuteData: INodeData

        const chatflow = await flowXpresApp.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowid
        })
        if (!chatflow) return res.status(404).send(`Chatflow ${chatflowid} not found`)

        const chatId = incomingInput.chatId ?? incomingInput.overrideConfig?.sessionId ?? uuidv4()
        const userMessageDateTime = new Date()

        if (!isInternal) {
            const isKeyValidated = await validateKey(req, chatflow)
            if (!isKeyValidated) return res.status(401).send('Unauthorized')
        }

        let isStreamValid = false

        const files = (req.files as any[]) || []

        if (files.length) {
            const overrideConfig: ICommonObject = { ...req.body }
            for (const file of files) {
                const fileData = fs.readFileSync(file.path, { encoding: 'base64' })
                const dataBase64String = `data:${file.mimetype};base64,${fileData},filename:${file.filename}`

                const fileInputField = mapMimeTypeToInputField(file.mimetype)
                if (overrideConfig[fileInputField]) {
                    overrideConfig[fileInputField] = JSON.stringify([...JSON.parse(overrideConfig[fileInputField]), dataBase64String])
                } else {
                    overrideConfig[fileInputField] = JSON.stringify([dataBase64String])
                }
            }
            incomingInput = {
                question: req.body.question ?? 'hello',
                overrideConfig,
                history: [],
                socketIOClientId: req.body.socketIOClientId
            }
        }

        /*** Get chatflows and prepare data  ***/
        const flowData = chatflow.flowData
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const nodes = parsedFlowData.nodes
        const edges = parsedFlowData.edges

        // Get session ID
        const memoryNode = findMemoryNode(nodes, edges)
        const memoryType = memoryNode?.data.label
        let sessionId = undefined
        if (memoryNode) sessionId = getMemorySessionId(memoryNode, incomingInput, chatId, isInternal)

        /*   Reuse the flow without having to rebuild (to avoid duplicated upsert, recomputation, reinitialization of memory) when all these conditions met:
         * - Node Data already exists in pool
         * - Still in sync (i.e the flow has not been modified since)
         * - Existing overrideConfig and new overrideConfig are the same
         * - Flow doesn't start with/contain nodes that depend on incomingInput.question
         * TODO: convert overrideConfig to hash when we no longer store base64 string but filepath
         ***/
        const isFlowReusable = () => {
            return (
                Object.prototype.hasOwnProperty.call(flowXpresApp.chatflowPool.activeChatflows, chatflowid) &&
                flowXpresApp.chatflowPool.activeChatflows[chatflowid].inSync &&
                flowXpresApp.chatflowPool.activeChatflows[chatflowid].endingNodeData &&
                isSameOverrideConfig(
                    isInternal,
                    flowXpresApp.chatflowPool.activeChatflows[chatflowid].overrideConfig,
                    incomingInput.overrideConfig
                ) &&
                !isStartNodeDependOnInput(flowXpresApp.chatflowPool.activeChatflows[chatflowid].startingNodes, nodes)
            )
        }

        if (isFlowReusable()) {
            nodeToExecuteData = flowXpresApp.chatflowPool.activeChatflows[chatflowid].endingNodeData as INodeData
            isStreamValid = isFlowValidForStream(nodes, nodeToExecuteData)
            logger.debug(
                `[server]: Reuse existing chatflow ${chatflowid} with ending node ${nodeToExecuteData.label} (${nodeToExecuteData.id})`
            )
        } else {
            /*** Get Ending Node with Directed Graph  ***/
            const { graph, nodeDependencies } = constructGraphs(nodes, edges)
            const directedGraph = graph
            const endingNodeIds = getEndingNodes(nodeDependencies, directedGraph)
            if (!endingNodeIds.length) return res.status(500).send(`Ending nodes not found`)

            const endingNodes = nodes.filter((nd) => endingNodeIds.includes(nd.id))

            let isEndingNodeExists = endingNodes.find((node) => node.data?.outputs?.output === 'EndingNode')

            for (const endingNode of endingNodes) {
                const endingNodeData = endingNode.data
                if (!endingNodeData) return res.status(500).send(`Ending node ${endingNode.id} data not found`)

                const isEndingNode = endingNodeData?.outputs?.output === 'EndingNode'

                if (!isEndingNode) {
                    if (
                        endingNodeData &&
                        endingNodeData.category !== 'Chains' &&
                        endingNodeData.category !== 'Agents' &&
                        endingNodeData.category !== 'Engine'
                    ) {
                        return res.status(500).send(`Ending node must be either a Chain or Agent`)
                    }

                    if (
                        endingNodeData.outputs &&
                        Object.keys(endingNodeData.outputs).length &&
                        !Object.values(endingNodeData.outputs ?? {}).includes(endingNodeData.name)
                    ) {
                        return res
                            .status(500)
                            .send(
                                `Output of ${endingNodeData.label} (${endingNodeData.id}) must be ${endingNodeData.label}, can't be an Output Prediction`
                            )
                    }
                }

                isStreamValid = isFlowValidForStream(nodes, endingNodeData)
            }

            // Once custom function ending node exists, flow is always unavailable to stream
            isStreamValid = isEndingNodeExists ? false : isStreamValid

            let chatHistory: IMessage[] = incomingInput.history ?? []

            // When {{chat_history}} is used in Prompt Template, fetch the chat conversations from memory node
            for (const endingNode of endingNodes) {
                const endingNodeData = endingNode.data

                if (!endingNodeData.inputs?.memory) continue

                const memoryNodeId = endingNodeData.inputs?.memory.split('.')[0].replace('{{', '')
                const memoryNode = nodes.find((node) => node.data.id === memoryNodeId)

                if (!memoryNode) continue

                if (!chatHistory.length && (incomingInput.chatId || incomingInput.overrideConfig?.sessionId)) {
                    chatHistory = await getSessionChatHistory(
                        memoryNode,
                        flowXpresApp.nodesPool.componentNodes,
                        incomingInput,
                        flowXpresApp.AppDataSource,
                        databaseEntities,
                        logger
                    )
                }
            }

            /*** Get Starting Nodes with Reversed Graph ***/
            const constructedObj = constructGraphs(nodes, edges, { isReversed: true })
            const nonDirectedGraph = constructedObj.graph
            let startingNodeIds: string[] = []
            let depthQueue: IDepthQueue = {}
            for (const endingNodeId of endingNodeIds) {
                const res = getStartingNodes(nonDirectedGraph, endingNodeId)
                startingNodeIds.push(...res.startingNodeIds)
                depthQueue = Object.assign(depthQueue, res.depthQueue)
            }
            startingNodeIds = [...new Set(startingNodeIds)]

            const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.id))

            logger.debug(`[server]: Start building chatflow ${chatflowid}`)
            /*** BFS to traverse from Starting Nodes to Ending Node ***/
            const reactFlowNodes = await buildFlow(
                startingNodeIds,
                nodes,
                edges,
                graph,
                depthQueue,
                flowXpresApp.nodesPool.componentNodes,
                incomingInput.question,
                chatHistory,
                chatId,
                sessionId ?? '',
                chatflowid,
                flowXpresApp.AppDataSource,
                incomingInput?.overrideConfig,
                flowXpresApp.cachePool
            )

            const nodeToExecute =
                endingNodeIds.length === 1
                    ? reactFlowNodes.find((node: IReactFlowNode) => endingNodeIds[0] === node.id)
                    : reactFlowNodes[reactFlowNodes.length - 1]
            if (!nodeToExecute) return res.status(404).send(`Node not found`)

            if (incomingInput.overrideConfig) {
                nodeToExecute.data = replaceInputsWithConfig(nodeToExecute.data, incomingInput.overrideConfig)
            }

            const reactFlowNodeData: INodeData = resolveVariables(nodeToExecute.data, reactFlowNodes, incomingInput.question, chatHistory)
            nodeToExecuteData = reactFlowNodeData

            flowXpresApp.chatflowPool.add(chatflowid, nodeToExecuteData, startingNodes, incomingInput?.overrideConfig)
        }

        logger.debug(`[server]: Running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)

        const nodeInstanceFilePath = flowXpresApp.nodesPool.componentNodes[nodeToExecuteData.name].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const nodeInstance = new nodeModule.nodeClass({ sessionId })

        let result = isStreamValid
            ? await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                  chatId,
                  chatflowid,
                  chatHistory: incomingInput.history,
                  logger,
                  appDataSource: flowXpresApp.AppDataSource,
                  databaseEntities,
                  analytic: chatflow.analytic,
                  socketIO,
                  socketIOClientId: incomingInput.socketIOClientId
              })
            : await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                  chatId,
                  chatflowid,
                  chatHistory: incomingInput.history,
                  logger,
                  appDataSource: flowXpresApp.AppDataSource,
                  databaseEntities,
                  analytic: chatflow.analytic
              })

        result = typeof result === 'string' ? { text: result } : result

        // Retrieve threadId from assistant if exists
        if (typeof result === 'object' && result.assistant) {
            sessionId = result.assistant.threadId
        }

        const userMessage: Omit<IChatMessage, 'id'> = {
            role: 'userMessage',
            content: incomingInput.question,
            chatflowid,
            chatType: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
            chatId,
            memoryType,
            sessionId,
            createdDate: userMessageDateTime
        }
        await addChatMessage(userMessage)

        let resultText = ''
        if (result.text) resultText = result.text
        else if (result.json) resultText = '```json\n' + JSON.stringify(result.json, null, 2)
        else resultText = JSON.stringify(result, null, 2)

        const apiMessage: Omit<IChatMessage, 'id' | 'createdDate'> = {
            role: 'apiMessage',
            content: resultText,
            chatflowid,
            chatType: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
            chatId,
            memoryType,
            sessionId
        }
        if (result?.sourceDocuments) apiMessage.sourceDocuments = JSON.stringify(result.sourceDocuments)
        if (result?.usedTools) apiMessage.usedTools = JSON.stringify(result.usedTools)
        if (result?.fileAnnotations) apiMessage.fileAnnotations = JSON.stringify(result.fileAnnotations)
        const chatMessage = await addChatMessage(apiMessage)
        result.chatMessageId = chatMessage.id

        logger.debug(`[server]: Finished running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)
        await telemetryService.createEvent({
            name: `prediction_sent`,
            data: {
                version: await getAppVersion(),
                chatlowId: chatflowid,
                chatId,
                type: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                flowGraph: getTelemetryFlowObj(nodes, edges)
            }
        })

        // Prepare response
        result.chatId = chatId
        if (sessionId) result.sessionId = sessionId
        if (memoryType) result.memoryType = memoryType
        return res.json(result)
    } catch (e: any) {
        logger.error('[server]: Error:', e)
        return res.status(500).send(e.message)
    }
}
