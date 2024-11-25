import { Request } from 'express'
import * as path from 'path'
import {
    IFileUpload,
    convertSpeechToText,
    ICommonObject,
    addSingleFileToStorage,
    addArrayFilesToStorage,
    mapMimeTypeToInputField,
    mapExtToInputField,
    generateFollowUpPrompts,
    IServerSideEventStreamer
} from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import {
    IncomingInput,
    IMessage,
    INodeData,
    IReactFlowObject,
    IReactFlowNode,
    IDepthQueue,
    ChatType,
    IChatMessage,
    IChatFlow,
    IReactFlowEdge,
    IExecuteFlowParams,
    IFlowConfig
} from '../Interface'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { ChatFlow } from '../database/entities/ChatFlow'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import {
    isFlowValidForStream,
    buildFlow,
    getTelemetryFlowObj,
    getAppVersion,
    resolveVariables,
    getSessionChatHistory,
    findMemoryNode,
    replaceInputsWithConfig,
    getStartingNodes,
    getMemorySessionId,
    getEndingNodes,
    constructGraphs,
    getAPIOverrideConfig
} from '../utils'
import { validateChatflowAPIKey } from './validateKey'
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
import { FLOWISE_METRIC_COUNTERS, FLOWISE_COUNTER_STATUS, IMetricsProvider } from '../Interface.Metrics'

/*
 * Function to traverse the flow graph and execute the nodes
 */
export const executeFlow = async ({
    startingNodeIds,
    endingNodeIds,
    nodes,
    edges,
    graph,
    depthQueue,
    componentNodes,
    incomingInput,
    flowConfig,
    chatflow,
    memoryType,
    fileUploads,
    uploadedFilesContent,
    userMessageDateTime,
    appDataSource,
    apiOverrideStatus,
    nodeOverrides,
    variableOverrides,
    telemetry,
    cachePool,
    sseStreamer,
    baseURL,
    isStreamValid,
    isInternal
}: IExecuteFlowParams) => {
    const chatflowid = flowConfig.chatflowid
    const chatId = flowConfig.chatId
    let sessionId = flowConfig.sessionId
    const apiMessageId = flowConfig.apiMessageId
    const chatHistory = flowConfig.chatHistory
    const question = incomingInput.question
    const overrideConfig = incomingInput.overrideConfig ?? {}
    const uploads = incomingInput.uploads
    const prependMessages = incomingInput.history ?? []

    logger.debug(`[server]: Start building flow ${chatflowid}`)

    /*** BFS to traverse from Starting Nodes to Ending Node ***/
    const reactFlowNodes = await buildFlow({
        startingNodeIds,
        reactFlowNodes: nodes,
        reactFlowEdges: edges,
        apiMessageId,
        graph,
        depthQueue,
        componentNodes,
        question,
        uploadedFilesContent,
        chatHistory,
        chatId,
        sessionId,
        chatflowid,
        appDataSource,
        overrideConfig,
        apiOverrideStatus,
        nodeOverrides,
        variableOverrides,
        cachePool,
        isUpsert: false,
        uploads,
        baseURL
    })

    const nodeToExecute =
        endingNodeIds.length === 1
            ? reactFlowNodes.find((node: IReactFlowNode) => endingNodeIds[0] === node.id)
            : reactFlowNodes[reactFlowNodes.length - 1]
    if (!nodeToExecute) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node not found`)
    }

    if (incomingInput.overrideConfig && apiOverrideStatus) {
        nodeToExecute.data = replaceInputsWithConfig(nodeToExecute.data, incomingInput.overrideConfig, nodeOverrides, variableOverrides)
    }

    const reactFlowNodeData: INodeData = await resolveVariables(
        appDataSource,
        nodeToExecute.data,
        reactFlowNodes,
        question,
        chatHistory,
        flowConfig,
        uploadedFilesContent,
        variableOverrides
    )

    logger.debug(`[server]: Running ${reactFlowNodeData.label} (${reactFlowNodeData.id})`)

    const nodeInstanceFilePath = componentNodes[reactFlowNodeData.name].filePath as string
    const nodeModule = await import(nodeInstanceFilePath)
    const nodeInstance = new nodeModule.nodeClass({ sessionId })

    const finalQuestion = uploadedFilesContent ? `${uploadedFilesContent}\n\n${incomingInput.question}` : incomingInput.question

    const runParams = {
        chatId,
        chatflowid,
        apiMessageId,
        logger,
        appDataSource,
        databaseEntities,
        analytic: chatflow.analytic,
        uploads,
        prependMessages
    }

    let result = await nodeInstance.run(reactFlowNodeData, finalQuestion, {
        ...runParams,
        ...(isStreamValid && { sseStreamer, shouldStreamResponse: true })
    })

    result = typeof result === 'string' ? { text: result } : result

    // Retrieve threadId from assistant if exists
    if (typeof result === 'object' && result.assistant) {
        sessionId = result.assistant.threadId
    }

    const userMessage: Omit<IChatMessage, 'id'> = {
        role: 'userMessage',
        content: question,
        chatflowid,
        chatType: isInternal ? ChatType.INTERNAL : ChatType.EXTERNAL,
        chatId,
        memoryType,
        sessionId,
        createdDate: userMessageDateTime,
        fileUploads: uploads ? JSON.stringify(fileUploads) : undefined,
        leadEmail: incomingInput.leadEmail
    }
    await utilAddChatMessage(userMessage, appDataSource)

    let resultText = ''
    if (result.text) resultText = result.text
    else if (result.json) resultText = '```json\n' + JSON.stringify(result.json, null, 2)
    else resultText = JSON.stringify(result, null, 2)

    const apiMessage: Omit<IChatMessage, 'createdDate'> = {
        id: apiMessageId,
        role: 'apiMessage',
        content: resultText,
        chatflowid,
        chatType: isInternal ? ChatType.INTERNAL : ChatType.EXTERNAL,
        chatId,
        memoryType,
        sessionId
    }
    if (result?.sourceDocuments) apiMessage.sourceDocuments = JSON.stringify(result.sourceDocuments)
    if (result?.usedTools) apiMessage.usedTools = JSON.stringify(result.usedTools)
    if (result?.fileAnnotations) apiMessage.fileAnnotations = JSON.stringify(result.fileAnnotations)
    if (result?.artifacts) apiMessage.artifacts = JSON.stringify(result.artifacts)
    if (chatflow.followUpPrompts) {
        const followUpPromptsConfig = JSON.parse(chatflow.followUpPrompts)
        const followUpPrompts = await generateFollowUpPrompts(followUpPromptsConfig, apiMessage.content, {
            chatId,
            chatflowid,
            appDataSource,
            databaseEntities
        })
        if (followUpPrompts?.questions) {
            apiMessage.followUpPrompts = JSON.stringify(followUpPrompts.questions)
        }
    }

    const chatMessage = await utilAddChatMessage(apiMessage, appDataSource)

    logger.debug(`[server]: Finished running ${reactFlowNodeData.label} (${reactFlowNodeData.id})`)

    await telemetry.sendTelemetry('prediction_sent', {
        version: await getAppVersion(),
        chatflowId: chatflowid,
        chatId,
        type: isInternal ? ChatType.INTERNAL : ChatType.EXTERNAL,
        flowGraph: getTelemetryFlowObj(nodes, edges)
    })

    // Prepare response
    // return the question in the response
    // this is used when input text is empty but question is in audio format
    result.question = incomingInput.question
    result.chatId = chatId
    result.chatMessageId = chatMessage?.id
    result.followUpPrompts = JSON.stringify(apiMessage.followUpPrompts)
    result.isStreamValid = isStreamValid

    if (sessionId) result.sessionId = sessionId
    if (memoryType) result.memoryType = memoryType

    return result
}

/**
 * Function to check if the flow is valid for streaming
 * @param {IReactFlowNode[]} endingNodes
 * @param {IReactFlowNode[]} nodes
 * @param {Request} req
 * @returns {boolean}
 */
const checkIfStreamValid = async (endingNodes: IReactFlowNode[], nodes: IReactFlowNode[], req: Request): Promise<boolean> => {
    // Once custom function ending node exists, flow is always unavailable to stream
    const isCustomFunctionEndingNode = endingNodes.some((node) => node.data?.outputs?.output === 'EndingNode')
    if (isCustomFunctionEndingNode) return false

    let isStreamValid = false
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

    isStreamValid = (req.body.streaming === 'true' || req.body.streaming === true) && isStreamValid

    return isStreamValid
}

/**
 * Build/Data Preperation for execute function
 * @param {Request} req
 * @param {boolean} isInternal
 */
export const utilBuildChatflow = async (req: Request, isInternal: boolean = false): Promise<any> => {
    const appServer = getRunningExpressApp()
    try {
        const chatflowid = req.params.id

        const httpProtocol = req.get('x-forwarded-proto') || req.protocol
        const baseURL = `${httpProtocol}://${req.get('host')}`

        // Check if chatflow exists
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowid
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
        }

        // Validate API Key if its external API request
        if (!isInternal) {
            const isKeyValidated = await validateChatflowAPIKey(req, chatflow)
            if (!isKeyValidated) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
            }
        }

        let incomingInput: IncomingInput = req.body
        const chatId = incomingInput.chatId ?? incomingInput.overrideConfig?.sessionId ?? uuidv4()
        const userMessageDateTime = new Date()
        const prependMessages = incomingInput.history ?? []
        let chatHistory: IMessage[] = []

        let fileUploads: IFileUpload[] = []
        let uploadedFilesContent = ''
        if (incomingInput.uploads) {
            fileUploads = incomingInput.uploads
            for (let i = 0; i < fileUploads.length; i += 1) {
                const upload = fileUploads[i]

                // if upload in an image, a rag file, or audio
                if ((upload.type === 'file' || upload.type === 'file:rag' || upload.type === 'audio') && upload.data) {
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

                if (upload.type === 'file:full' && upload.data) {
                    upload.type = 'stored-file:full'
                    // Omit upload.data since we don't store the content in database
                    uploadedFilesContent += `<doc name='${upload.name}'>${upload.data}</doc>\n\n`
                    fileUploads[i] = omit(upload, ['data'])
                }
            }
        }

        const files = (req.files as Express.Multer.File[]) || []

        if (files.length) {
            const overrideConfig: ICommonObject = { ...req.body }
            const fileNames: string[] = []
            for (const file of files) {
                const fileBuffer = fs.readFileSync(file.path)
                // Address file name with special characters: https://github.com/expressjs/multer/issues/1104
                file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
                const storagePath = await addArrayFilesToStorage(file.mimetype, fileBuffer, file.originalname, fileNames, chatflowid)

                const fileInputFieldFromMimeType = mapMimeTypeToInputField(file.mimetype)

                const fileExtension = path.extname(file.originalname)

                const fileInputFieldFromExt = mapExtToInputField(fileExtension)

                let fileInputField = 'txtFile'

                if (fileInputFieldFromExt !== 'txtFile') {
                    fileInputField = fileInputFieldFromExt
                } else if (fileInputFieldFromMimeType !== 'txtFile') {
                    fileInputField = fileInputFieldFromExt
                }

                if (overrideConfig[fileInputField]) {
                    const existingFileInputField = overrideConfig[fileInputField].replace('FILE-STORAGE::', '')
                    const existingFileInputFieldArray = JSON.parse(existingFileInputField)

                    const newFileInputField = storagePath.replace('FILE-STORAGE::', '')
                    const newFileInputFieldArray = JSON.parse(newFileInputField)

                    const updatedFieldArray = existingFileInputFieldArray.concat(newFileInputFieldArray)

                    overrideConfig[fileInputField] = `FILE-STORAGE::${JSON.stringify(updatedFieldArray)}`
                } else {
                    overrideConfig[fileInputField] = storagePath
                }

                fs.unlinkSync(file.path)
            }
            if (overrideConfig.vars && typeof overrideConfig.vars === 'string') {
                overrideConfig.vars = JSON.parse(overrideConfig.vars)
            }
            incomingInput = {
                ...incomingInput,
                question: req.body.question ?? 'hello',
                overrideConfig
            }
            if (req.body.chatId) {
                incomingInput.chatId = req.body.chatId
            }
        }

        /*** Get chatflows and prepare data  ***/
        const flowData = chatflow.flowData
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const nodes = parsedFlowData.nodes
        const edges = parsedFlowData.edges

        const apiMessageId = uuidv4()

        /*** Get session ID ***/
        const memoryNode = findMemoryNode(nodes, edges)
        const memoryType = memoryNode?.data.label || ''
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
                apiMessageId,
                memoryType ?? '',
                sessionId,
                userMessageDateTime,
                fileUploads,
                incomingInput,
                nodes,
                edges,
                baseURL,
                appServer.sseStreamer,
                true,
                uploadedFilesContent
            )
        }

        const isStreamValid = await checkIfStreamValid(endingNodes, nodes, req)

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

        /*** Get API Config ***/
        const { nodeOverrides, variableOverrides, apiOverrideStatus } = getAPIOverrideConfig(chatflow)

        const flowConfig: IFlowConfig = {
            chatflowid,
            chatId,
            sessionId,
            chatHistory,
            apiMessageId,
            ...incomingInput.overrideConfig
        }

        const executeData: IExecuteFlowParams = {
            startingNodeIds,
            endingNodeIds,
            nodes,
            edges,
            graph: directedGraph,
            depthQueue,
            componentNodes: appServer.nodesPool.componentNodes,
            incomingInput,
            flowConfig,
            chatflow,
            memoryType,
            fileUploads,
            uploadedFilesContent,
            userMessageDateTime,
            appDataSource: appServer.AppDataSource,
            apiOverrideStatus,
            nodeOverrides,
            variableOverrides,
            sseStreamer: appServer.sseStreamer,
            telemetry: appServer.telemetry,
            cachePool: appServer.cachePool,
            baseURL,
            isStreamValid,
            isInternal
        }

        if (process.env.QUEUE_MODE === 'queue') {
            console.log('Start adding job')
            const job = await appServer.queueManager.addJob(
                omit(executeData, ['componentNodes', 'appDataSource', 'sseStreamer', 'telemetry', 'cachePool'])
            )
            console.log('Job:', job)
            const queueEvents = appServer.queueManager.getQueueEvents()
            const result = await job.waitUntilFinished(queueEvents)
            incrementMetricCounter(appServer.metricsProvider, isInternal)
            return result
            // Set up a one-time listener for the specific job completion
            /*queueEvents.once('completed', ({ jobId, returnvalue }) => {
                if (jobId === job.id) {
                    // Respond with the job result
                    console.log('Job completed:', returnvalue)
                    console.log('typeof Job completed:', typeof returnvalue)
                    const result = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue
                    if (isStreamValid) {
                        appServer.sseStreamer.streamMetadataEvent(result.chatId, result)
                    }
                    return returnvalue
                }
            })*/
        } else {
            const result = await executeFlow(executeData)
            incrementMetricCounter(appServer.metricsProvider, isInternal)
            return result
        }
    } catch (e) {
        appServer.metricsProvider?.incrementCounter(
            isInternal ? FLOWISE_METRIC_COUNTERS.CHATFLOW_PREDICTION_INTERNAL : FLOWISE_METRIC_COUNTERS.CHATFLOW_PREDICTION_EXTERNAL,
            { status: FLOWISE_COUNTER_STATUS.FAILURE }
        )
        logger.error('[server]: Error:', e)
        if (e instanceof InternalFlowiseError && e.statusCode === StatusCodes.UNAUTHORIZED) {
            throw e
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, getErrorMessage(e))
        }
    }
}

/**
 * Increment the metric counter
 * @param {IMetricsProvider} metricsProvider
 * @param {boolean} isInternal
 */
const incrementMetricCounter = (metricsProvider: IMetricsProvider, isInternal: boolean) => {
    metricsProvider?.incrementCounter(
        isInternal ? FLOWISE_METRIC_COUNTERS.CHATFLOW_PREDICTION_INTERNAL : FLOWISE_METRIC_COUNTERS.CHATFLOW_PREDICTION_EXTERNAL,
        { status: FLOWISE_COUNTER_STATUS.SUCCESS }
    )
}

/**
 * TODO: Function to build agent response, create interface for params
 */
const utilBuildAgentResponse = async (
    agentflow: IChatFlow,
    isInternal: boolean,
    chatId: string,
    apiMessageId: string,
    memoryType: string,
    sessionId: string,
    userMessageDateTime: Date,
    fileUploads: IFileUpload[],
    incomingInput: IncomingInput,
    nodes: IReactFlowNode[],
    edges: IReactFlowEdge[],
    baseURL?: string,
    sseStreamer?: IServerSideEventStreamer,
    shouldStreamResponse?: boolean,
    uploadedFilesContent?: string
) => {
    const appServer = getRunningExpressApp()
    try {
        // TODO: add redis queue
        const streamResults = await buildAgentGraph(
            agentflow,
            chatId,
            apiMessageId,
            sessionId,
            incomingInput,
            isInternal,
            baseURL,
            sseStreamer,
            shouldStreamResponse,
            uploadedFilesContent
        )
        if (streamResults) {
            const { finalResult, finalAction, sourceDocuments, artifacts, usedTools, agentReasoning } = streamResults
            const userMessage: Omit<IChatMessage, 'id'> = {
                role: 'userMessage',
                content: incomingInput.question,
                chatflowid: agentflow.id,
                chatType: isInternal ? ChatType.INTERNAL : ChatType.EXTERNAL,
                chatId,
                memoryType,
                sessionId,
                createdDate: userMessageDateTime,
                fileUploads: incomingInput.uploads ? JSON.stringify(fileUploads) : undefined,
                leadEmail: incomingInput.leadEmail
            }
            await utilAddChatMessage(userMessage)

            const apiMessage: Omit<IChatMessage, 'createdDate'> = {
                id: apiMessageId,
                role: 'apiMessage',
                content: finalResult,
                chatflowid: agentflow.id,
                chatType: isInternal ? ChatType.INTERNAL : ChatType.EXTERNAL,
                chatId,
                memoryType,
                sessionId
            }

            if (sourceDocuments?.length) apiMessage.sourceDocuments = JSON.stringify(sourceDocuments)
            if (artifacts?.length) apiMessage.artifacts = JSON.stringify(artifacts)
            if (usedTools?.length) apiMessage.usedTools = JSON.stringify(usedTools)
            if (agentReasoning?.length) apiMessage.agentReasoning = JSON.stringify(agentReasoning)
            if (finalAction && Object.keys(finalAction).length) apiMessage.action = JSON.stringify(finalAction)

            if (agentflow.followUpPrompts) {
                const followUpPromptsConfig = JSON.parse(agentflow.followUpPrompts)
                const generatedFollowUpPrompts = await generateFollowUpPrompts(followUpPromptsConfig, apiMessage.content, {
                    chatId,
                    chatflowid: agentflow.id,
                    appDataSource: appServer.AppDataSource,
                    databaseEntities
                })
                if (generatedFollowUpPrompts?.questions) {
                    apiMessage.followUpPrompts = JSON.stringify(generatedFollowUpPrompts.questions)
                }
            }
            const chatMessage = await utilAddChatMessage(apiMessage)

            await appServer.telemetry.sendTelemetry('agentflow_prediction_sent', {
                version: await getAppVersion(),
                agentflowId: agentflow.id,
                chatId,
                type: isInternal ? ChatType.INTERNAL : ChatType.EXTERNAL,
                flowGraph: getTelemetryFlowObj(nodes, edges)
            })
            appServer.metricsProvider?.incrementCounter(
                isInternal ? FLOWISE_METRIC_COUNTERS.AGENTFLOW_PREDICTION_INTERNAL : FLOWISE_METRIC_COUNTERS.AGENTFLOW_PREDICTION_EXTERNAL,
                { status: FLOWISE_COUNTER_STATUS.SUCCESS }
            )

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
            if (agentReasoning?.length) result.agentReasoning = agentReasoning
            if (finalAction && Object.keys(finalAction).length) result.action = finalAction
            result.followUpPrompts = JSON.stringify(apiMessage.followUpPrompts)

            return result
        }
        return undefined
    } catch (e) {
        logger.error('[server]: Error:', e)
        appServer.metricsProvider?.incrementCounter(
            isInternal ? FLOWISE_METRIC_COUNTERS.AGENTFLOW_PREDICTION_INTERNAL : FLOWISE_METRIC_COUNTERS.AGENTFLOW_PREDICTION_EXTERNAL,
            { status: FLOWISE_COUNTER_STATUS.FAILURE }
        )
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, getErrorMessage(e))
    }
}
