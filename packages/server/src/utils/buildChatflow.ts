import { Request } from 'express'
import { IFileUpload, convertSpeechToText, ICommonObject, addSingleFileToStorage, addArrayFilesToStorage } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import {
    IncomingInput,
    IMessage,
    INodeData,
    IReactFlowObject,
    IReactFlowNode,
    IDepthQueue,
    chatType,
    IChatMessage,
    IChatFlow,
    IReactFlowEdge
} from '../Interface'
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
import { buildAgentGraph } from './buildAgentGraph'
import { getErrorMessage } from '../errors/utils'
import { ChatMessage } from '../database/entities/ChatMessage'
import { IAction } from 'flowise-components'

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

        const httpProtocol = req.get('x-forwarded-proto') || req.protocol
        const baseURL = `${httpProtocol}://${req.get('host')}`

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
                    const splitDataURI = upload.data.split(',')
                    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                    const mime = splitDataURI[0].split(':')[1].split(';')[0]
                    await addSingleFileToStorage(mime, bf, filename, chatflowid, chatId)
                    upload.type = 'stored-file'
                    // Omit upload.data since we don't store the content in database
                    fileUploads[i] = omit(upload, ['data'])
                }

                if (upload.type === 'url' && upload.data) {
                    const filename = upload.name
                    const urlData = upload.data
                    fileUploads[i] = { data: urlData, name: filename, type: 'url', mime: upload.mime ?? 'image/png' }
                }

                // Run Speech to Text conversion
                if (upload.mime === 'audio/webm' || upload.mime === 'audio/mp4' || upload.mime === 'audio/ogg') {
                    logger.debug(`Attempting a speech to text conversion...`)
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
                        logger.debug(`Speech to text result: ${speechToTextResult}`)
                        if (speechToTextResult) {
                            incomingInput.question = speechToTextResult
                        }
                    }
                }
            }
        }

        let isStreamValid = false

        const files = (req.files as Express.Multer.File[]) || []

        if (files.length) {
            const overrideConfig: ICommonObject = { ...req.body }
            const fileNames: string[] = []
            for (const file of files) {
                const fileBuffer = fs.readFileSync(file.path)

                const storagePath = await addArrayFilesToStorage(file.mimetype, fileBuffer, file.originalname, fileNames, chatflowid)

                const fileInputField = mapMimeTypeToInputField(file.mimetype)

                overrideConfig[fileInputField] = storagePath

                fs.unlinkSync(file.path)
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

        /*** Get session ID ***/
        const memoryNode = findMemoryNode(nodes, edges)
        const memoryType = memoryNode?.data.label
        let sessionId = getMemorySessionId(memoryNode, incomingInput, chatId, isInternal)

        /*** Get Ending Node with Directed Graph  ***/
        const { graph, nodeDependencies } = constructGraphs(nodes, edges)
        const directedGraph = graph
        const endingNodes = getEndingNodes(nodeDependencies, directedGraph, nodes)

        /*** If the graph is an agent graph, build the agent response ***/
        if (endingNodes.filter((node) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents').length) {
            return await utilBuildAgentResponse(
                chatflow,
                isInternal,
                chatId,
                memoryType ?? '',
                sessionId,
                userMessageDateTime,
                fileUploads,
                incomingInput,
                nodes,
                edges,
                socketIO,
                baseURL
            )
        }

        // Get prepend messages
        const prependMessages = incomingInput.history

        /*   Reuse the flow without having to rebuild (to avoid duplicated upsert, recomputation, reinitialization of memory) when all these conditions met:
         * - Reuse of flows is not disabled
         * - Node Data already exists in pool
         * - Still in sync (i.e the flow has not been modified since)
         * - Existing overrideConfig and new overrideConfig are the same
         * - Flow doesn't start with/contain nodes that depend on incomingInput.question
         ***/
        const isFlowReusable = () => {
            return (
                process.env.DISABLE_CHATFLOW_REUSE !== 'true' &&
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
            const isCustomFunctionEndingNode = endingNodes.some((node) => node.data?.outputs?.output === 'EndingNode')

            for (const endingNode of endingNodes) {
                const endingNodeData = endingNode.data

                const isEndingNode = endingNodeData?.outputs?.output === 'EndingNode'

                // Once custom function ending node exists, no need to do follow-up checks.
                if (isEndingNode) continue

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

                isStreamValid = isFlowValidForStream(nodes, endingNodeData)
            }

            // Once custom function ending node exists, flow is always unavailable to stream
            isStreamValid = isCustomFunctionEndingNode ? false : isStreamValid

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
                    logger,
                    prependMessages
                )
            }

            /*** Get Starting Nodes with Reversed Graph ***/
            const constructedObj = constructGraphs(nodes, edges, { isReversed: true })
            const nonDirectedGraph = constructedObj.graph
            let startingNodeIds: string[] = []
            let depthQueue: IDepthQueue = {}
            const endingNodeIds = endingNodes.map((n) => n.id)
            for (const endingNodeId of endingNodeIds) {
                const resx = getStartingNodes(nonDirectedGraph, endingNodeId)
                startingNodeIds.push(...resx.startingNodeIds)
                depthQueue = Object.assign(depthQueue, resx.depthQueue)
            }
            startingNodeIds = [...new Set(startingNodeIds)]

            const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.id))

            logger.debug(`[server]: Start building chatflow ${chatflowid}`)
            /*** BFS to traverse from Starting Nodes to Ending Node ***/
            const reactFlowNodes = await buildFlow({
                startingNodeIds,
                reactFlowNodes: nodes,
                reactFlowEdges: edges,
                graph,
                depthQueue,
                componentNodes: appServer.nodesPool.componentNodes,
                question: incomingInput.question,
                chatHistory,
                chatId,
                sessionId: sessionId ?? '',
                chatflowid,
                appDataSource: appServer.AppDataSource,
                overrideConfig: incomingInput?.overrideConfig,
                cachePool: appServer.cachePool,
                isUpsert: false,
                uploads: incomingInput.uploads,
                baseURL,
                socketIO,
                socketIOClientId: incomingInput.socketIOClientId
            })

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

            const reactFlowNodeData: INodeData = await resolveVariables(
                appServer.AppDataSource,
                nodeToExecute.data,
                reactFlowNodes,
                incomingInput.question,
                chatHistory,
                incomingInput.overrideConfig
            )
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
                  socketIOClientId: incomingInput.socketIOClientId,
                  prependMessages
              })
            : await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                  chatId,
                  chatflowid,
                  logger,
                  appDataSource: appServer.AppDataSource,
                  databaseEntities,
                  analytic: chatflow.analytic,
                  uploads: incomingInput.uploads,
                  prependMessages
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
            fileUploads: incomingInput.uploads ? JSON.stringify(fileUploads) : undefined,
            leadEmail: incomingInput.leadEmail
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
        result.chatMessageId = chatMessage?.id
        if (sessionId) result.sessionId = sessionId
        if (memoryType) result.memoryType = memoryType

        return result
    } catch (e) {
        logger.error('[server]: Error:', e)
        if (e instanceof InternalFlowiseError && e.statusCode === StatusCodes.UNAUTHORIZED) {
            throw e
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, getErrorMessage(e))
        }
    }
}

const utilBuildAgentResponse = async (
    agentflow: IChatFlow,
    isInternal: boolean,
    chatId: string,
    memoryType: string,
    sessionId: string,
    userMessageDateTime: Date,
    fileUploads: IFileUpload[],
    incomingInput: IncomingInput,
    nodes: IReactFlowNode[],
    edges: IReactFlowEdge[],
    socketIO?: Server,
    baseURL?: string
) => {
    try {
        const appServer = getRunningExpressApp()
        const streamResults = await buildAgentGraph(agentflow, chatId, sessionId, incomingInput, isInternal, baseURL, socketIO)
        if (streamResults) {
            const { finalResult, finalAction, sourceDocuments, usedTools, agentReasoning } = streamResults
            const userMessage: Omit<IChatMessage, 'id'> = {
                role: 'userMessage',
                content: incomingInput.question,
                chatflowid: agentflow.id,
                chatType: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                chatId,
                memoryType,
                sessionId,
                createdDate: userMessageDateTime,
                fileUploads: incomingInput.uploads ? JSON.stringify(fileUploads) : undefined,
                leadEmail: incomingInput.leadEmail
            }
            await utilAddChatMessage(userMessage)

            const apiMessage: Omit<IChatMessage, 'id' | 'createdDate'> = {
                role: 'apiMessage',
                content: finalResult,
                chatflowid: agentflow.id,
                chatType: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                chatId,
                memoryType,
                sessionId
            }
            if (sourceDocuments.length) apiMessage.sourceDocuments = JSON.stringify(sourceDocuments)
            if (usedTools.length) apiMessage.usedTools = JSON.stringify(usedTools)
            if (agentReasoning.length) apiMessage.agentReasoning = JSON.stringify(agentReasoning)
            if (Object.keys(finalAction).length) apiMessage.action = JSON.stringify(finalAction)
            const chatMessage = await utilAddChatMessage(apiMessage)

            await appServer.telemetry.sendTelemetry('agentflow_prediction_sent', {
                version: await getAppVersion(),
                agentflowId: agentflow.id,
                chatId,
                type: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                flowGraph: getTelemetryFlowObj(nodes, edges)
            })

            // Find the previous chat message with the same action id and remove the action
            if (incomingInput.action && Object.keys(incomingInput.action).length) {
                let query = await appServer.AppDataSource.getRepository(ChatMessage)
                    .createQueryBuilder('chat_message')
                    .where('chat_message.chatId = :chatId', { chatId })
                    .orWhere('chat_message.sessionId = :sessionId', { sessionId })
                    .orderBy('chat_message.createdDate', 'DESC')
                    .getMany()

                for (const result of query) {
                    if (result.action) {
                        try {
                            const action: IAction = JSON.parse(result.action)
                            if (action.id === incomingInput.action.id) {
                                const newChatMessage = new ChatMessage()
                                Object.assign(newChatMessage, result)
                                newChatMessage.action = null
                                const cm = await appServer.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
                                await appServer.AppDataSource.getRepository(ChatMessage).save(cm)
                                break
                            }
                        } catch (e) {
                            // error converting action to JSON
                        }
                    }
                }
            }

            // Prepare response
            let result: ICommonObject = {}
            result.text = finalResult
            result.question = incomingInput.question
            result.chatId = chatId
            result.chatMessageId = chatMessage?.id
            if (sessionId) result.sessionId = sessionId
            if (memoryType) result.memoryType = memoryType
            if (agentReasoning.length) result.agentReasoning = agentReasoning
            if (Object.keys(finalAction).length) result.action = finalAction

            return result
        }
        return undefined
    } catch (e) {
        logger.error('[server]: Error:', e)
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, getErrorMessage(e))
    }
}
