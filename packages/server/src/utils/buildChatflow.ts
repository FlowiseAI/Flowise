import { Request } from 'express'
import { IFileUpload, getStoragePath, convertSpeechToText, ICommonObject } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { IncomingInput, IMessage, INodeData, IReactFlowObject, IReactFlowNode, IDepthQueue, chatType, IChatMessage } from '../Interface'
import path from 'path'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { ChatFlow } from '../database/entities/ChatFlow'
import { Server } from 'socket.io'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import {
    mapMimeTypeToInputField,
    isFlowValidForStream,
    buildFlow,
    getTelemetryFlowObj,
    getAppVersion,
    resolveVariables,
    getSessionChatHistory,
    findMemoryNode,
    replaceInputsWithConfig,
    getStartingNodes,
    isStartNodeDependOnInput,
    getMemorySessionId,
    isSameOverrideConfig,
    getEndingNodes,
    constructGraphs
} from '../utils'
import { utilValidateKey } from './validateKey'
import { databaseEntities } from '.'
import { v4 as uuidv4 } from 'uuid'
import { omit } from 'lodash'
import * as fs from 'fs'
import logger from './logger'
import { utilAddChatMessage } from './addChatMesage'

/**
 * Build Chatflow
 * @param {Request} req
 * @param {Server} socketIO
 * @param {boolean} isInternal
 */
export const utilBuildChatflow = async (req: Request, socketIO?: Server, isInternal: boolean = false): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const chatflowid = req.params.id
        let incomingInput: IncomingInput = req.body
        let nodeToExecuteData: INodeData
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowid
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
        }

        const chatId = incomingInput.chatId ?? incomingInput.overrideConfig?.sessionId ?? uuidv4()
        const userMessageDateTime = new Date()

        if (!isInternal) {
            const isKeyValidated = await utilValidateKey(req, chatflow)
            if (!isKeyValidated) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
            }
        }

        let fileUploads: IFileUpload[] = []
        if (incomingInput.uploads) {
            fileUploads = incomingInput.uploads
            for (let i = 0; i < fileUploads.length; i += 1) {
                const upload = fileUploads[i]
                if ((upload.type === 'file' || upload.type === 'audio') && upload.data) {
                    const filename = upload.name
                    const dir = path.join(getStoragePath(), chatflowid, chatId)
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true })
                    }
                    const filePath = path.join(dir, filename)
                    const splitDataURI = upload.data.split(',')
                    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                    fs.writeFileSync(filePath, bf)

                    // Omit upload.data since we don't store the content in database
                    upload.type = 'stored-file'
                    fileUploads[i] = omit(upload, ['data'])
                }

                // Run Speech to Text conversion
                if (upload.mime === 'audio/webm') {
                    let speechToTextConfig: ICommonObject = {}
                    if (chatflow.speechToText) {
                        const speechToTextProviders = JSON.parse(chatflow.speechToText)
                        for (const provider in speechToTextProviders) {
                            const providerObj = speechToTextProviders[provider]
                            if (providerObj.status) {
                                speechToTextConfig = providerObj
                                speechToTextConfig['name'] = provider
                                break
                            }
                        }
                    }
                    if (speechToTextConfig) {
                        const options: ICommonObject = {
                            chatId,
                            chatflowid,
                            appDataSource: appServer.AppDataSource,
                            databaseEntities: databaseEntities
                        }
                        const speechToTextResult = await convertSpeechToText(upload, speechToTextConfig, options)
                        if (speechToTextResult) {
                            incomingInput.question = speechToTextResult
                        }
                    }
                }
            }
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
        let sessionId = getMemorySessionId(memoryNode, incomingInput, chatId, isInternal)

        /*   Reuse the flow without having to rebuild (to avoid duplicated upsert, recomputation, reinitialization of memory) when all these conditions met:
         * - Node Data already exists in pool
         * - Still in sync (i.e the flow has not been modified since)
         * - Existing overrideConfig and new overrideConfig are the same
         * - Flow doesn't start with/contain nodes that depend on incomingInput.question
         * TODO: convert overrideConfig to hash when we no longer store base64 string but filepath
         ***/
        const isFlowReusable = () => {
            return (
                Object.prototype.hasOwnProperty.call(appServer.chatflowPool.activeChatflows, chatflowid) &&
                appServer.chatflowPool.activeChatflows[chatflowid].inSync &&
                appServer.chatflowPool.activeChatflows[chatflowid].endingNodeData &&
                isSameOverrideConfig(
                    isInternal,
                    appServer.chatflowPool.activeChatflows[chatflowid].overrideConfig,
                    incomingInput.overrideConfig
                ) &&
                !isStartNodeDependOnInput(appServer.chatflowPool.activeChatflows[chatflowid].startingNodes, nodes)
            )
        }

        if (isFlowReusable()) {
            nodeToExecuteData = appServer.chatflowPool.activeChatflows[chatflowid].endingNodeData as INodeData
            isStreamValid = isFlowValidForStream(nodes, nodeToExecuteData)
            logger.debug(
                `[server]: Reuse existing chatflow ${chatflowid} with ending node ${nodeToExecuteData.label} (${nodeToExecuteData.id})`
            )
        } else {
            /*** Get Ending Node with Directed Graph  ***/
            const { graph, nodeDependencies } = constructGraphs(nodes, edges)
            const directedGraph = graph
            const endingNodeIds = getEndingNodes(nodeDependencies, directedGraph)
            if (!endingNodeIds.length) {
                throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Ending nodes not found`)
            }

            const endingNodes = nodes.filter((nd) => endingNodeIds.includes(nd.id))

            let isEndingNodeExists = endingNodes.find((node) => node.data?.outputs?.output === 'EndingNode')

            for (const endingNode of endingNodes) {
                const endingNodeData = endingNode.data
                if (!endingNodeData) {
                    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Ending node ${endingNode.id} data not found`)
                }

                const isEndingNode = endingNodeData?.outputs?.output === 'EndingNode'

                if (!isEndingNode) {
                    if (
                        endingNodeData &&
                        endingNodeData.category !== 'Chains' &&
                        endingNodeData.category !== 'Agents' &&
                        endingNodeData.category !== 'Engine'
                    ) {
                        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Ending node must be either a Chain or Agent`)
                    }

                    if (
                        endingNodeData.outputs &&
                        Object.keys(endingNodeData.outputs).length &&
                        !Object.values(endingNodeData.outputs ?? {}).includes(endingNodeData.name)
                    ) {
                        throw new InternalFlowiseError(
                            StatusCodes.INTERNAL_SERVER_ERROR,
                            `Output of ${endingNodeData.label} (${endingNodeData.id}) must be ${endingNodeData.label}, can't be an Output Prediction`
                        )
                    }
                }

                isStreamValid = isFlowValidForStream(nodes, endingNodeData)
            }

            // Once custom function ending node exists, flow is always unavailable to stream
            isStreamValid = isEndingNodeExists ? false : isStreamValid

            let chatHistory: IMessage[] = []

            // When {{chat_history}} is used in Format Prompt Value, fetch the chat conversations from memory node
            for (const endingNode of endingNodes) {
                const endingNodeData = endingNode.data

                if (!endingNodeData.inputs?.memory) continue

                const memoryNodeId = endingNodeData.inputs?.memory.split('.')[0].replace('{{', '')
                const memoryNode = nodes.find((node) => node.data.id === memoryNodeId)

                if (!memoryNode) continue

                chatHistory = await getSessionChatHistory(
                    chatflowid,
                    getMemorySessionId(memoryNode, incomingInput, chatId, isInternal),
                    memoryNode,
                    appServer.nodesPool.componentNodes,
                    appServer.AppDataSource,
                    databaseEntities,
                    logger
                )
            }

            /*** Get Starting Nodes with Reversed Graph ***/
            const constructedObj = constructGraphs(nodes, edges, { isReversed: true })
            const nonDirectedGraph = constructedObj.graph
            let startingNodeIds: string[] = []
            let depthQueue: IDepthQueue = {}
            for (const endingNodeId of endingNodeIds) {
                const resx = getStartingNodes(nonDirectedGraph, endingNodeId)
                startingNodeIds.push(...resx.startingNodeIds)
                depthQueue = Object.assign(depthQueue, resx.depthQueue)
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
                appServer.nodesPool.componentNodes,
                incomingInput.question,
                chatHistory,
                chatId,
                sessionId ?? '',
                chatflowid,
                appServer.AppDataSource,
                incomingInput?.overrideConfig,
                appServer.cachePool,
                false,
                undefined,
                incomingInput.uploads
            )

            const nodeToExecute =
                endingNodeIds.length === 1
                    ? reactFlowNodes.find((node: IReactFlowNode) => endingNodeIds[0] === node.id)
                    : reactFlowNodes[reactFlowNodes.length - 1]
            if (!nodeToExecute) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node not found`)
            }

            if (incomingInput.overrideConfig) {
                nodeToExecute.data = replaceInputsWithConfig(nodeToExecute.data, incomingInput.overrideConfig)
            }

            const reactFlowNodeData: INodeData = resolveVariables(nodeToExecute.data, reactFlowNodes, incomingInput.question, chatHistory)
            nodeToExecuteData = reactFlowNodeData

            appServer.chatflowPool.add(chatflowid, nodeToExecuteData, startingNodes, incomingInput?.overrideConfig)
        }

        logger.debug(`[server]: Running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)

        const nodeInstanceFilePath = appServer.nodesPool.componentNodes[nodeToExecuteData.name].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const nodeInstance = new nodeModule.nodeClass({ sessionId })

        let result = isStreamValid
            ? await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                  chatId,
                  chatflowid,
                  logger,
                  appDataSource: appServer.AppDataSource,
                  databaseEntities,
                  analytic: chatflow.analytic,
                  uploads: incomingInput.uploads,
                  socketIO,
                  socketIOClientId: incomingInput.socketIOClientId
              })
            : await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                  chatId,
                  chatflowid,
                  logger,
                  appDataSource: appServer.AppDataSource,
                  databaseEntities,
                  analytic: chatflow.analytic,
                  uploads: incomingInput.uploads
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
            createdDate: userMessageDateTime,
            fileUploads: incomingInput.uploads ? JSON.stringify(fileUploads) : undefined
        }
        await utilAddChatMessage(userMessage)

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
        const chatMessage = await utilAddChatMessage(apiMessage)

        logger.debug(`[server]: Finished running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)
        await appServer.telemetry.sendTelemetry('prediction_sent', {
            version: await getAppVersion(),
            chatflowId: chatflowid,
            chatId,
            type: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
            flowGraph: getTelemetryFlowObj(nodes, edges)
        })

        // Prepare response
        // return the question in the response
        // this is used when input text is empty but question is in audio format
        result.question = incomingInput.question
        result.chatId = chatId
        result.chatMessageId = chatMessage.id
        if (sessionId) result.sessionId = sessionId
        if (memoryType) result.memoryType = memoryType

        return result
    } catch (e: any) {
        logger.error('[server]: Error:', e)
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, e.message)
    }
}
