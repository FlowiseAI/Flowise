import { Request } from 'express'
import * as path from 'path'
import { cloneDeep, omit } from 'lodash'
import {
    IMessage,
    addArrayFilesToStorage,
    mapMimeTypeToInputField,
    mapExtToInputField,
    getFileFromUpload,
    removeSpecificFileFromUpload
} from 'flowise-components'
import logger from '../utils/logger'
import {
    buildFlow,
    constructGraphs,
    getAllConnectedNodes,
    findMemoryNode,
    getMemorySessionId,
    getAppVersion,
    getTelemetryFlowObj,
    getStartingNodes,
    getAPIOverrideConfig
} from '../utils'
import { validateFlowAPIKey } from './validateKey'
import { IncomingInput, INodeDirectedGraph, IReactFlowObject, ChatType, IExecuteFlowParams, MODE } from '../Interface'
import { ChatFlow } from '../database/entities/ChatFlow'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { UpsertHistory } from '../database/entities/UpsertHistory'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { checkStorage, updateStorageUsage } from './quotaUsage'
import { getErrorMessage } from '../errors/utils'
import { v4 as uuidv4 } from 'uuid'
import { FLOWISE_COUNTER_STATUS, FLOWISE_METRIC_COUNTERS } from '../Interface.Metrics'
import { Variable } from '../database/entities/Variable'
import { getWorkspaceSearchOptions } from '../enterprise/utils/ControllerServiceUtils'
import { OMIT_QUEUE_JOB_DATA } from './constants'
import { Workspace } from '../enterprise/database/entities/workspace.entity'
import { Organization } from '../enterprise/database/entities/organization.entity'

export const executeUpsert = async ({
    componentNodes,
    incomingInput,
    chatflow,
    chatId,
    appDataSource,
    telemetry,
    cachePool,
    isInternal,
    files,
    orgId,
    workspaceId,
    subscriptionId,
    usageCacheManager
}: IExecuteFlowParams) => {
    const question = incomingInput.question
    let overrideConfig = incomingInput.overrideConfig ?? {}
    let stopNodeId = incomingInput?.stopNodeId ?? ''
    const chatHistory: IMessage[] = []
    const isUpsert = true
    const chatflowid = chatflow.id
    const apiMessageId = uuidv4()

    if (files?.length) {
        overrideConfig = { ...incomingInput }
        for (const file of files) {
            await checkStorage(orgId, subscriptionId, usageCacheManager)

            const fileNames: string[] = []
            const fileBuffer = await getFileFromUpload(file.path ?? file.key)
            // Address file name with special characters: https://github.com/expressjs/multer/issues/1104
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
            const { path: storagePath, totalSize } = await addArrayFilesToStorage(
                file.mimetype,
                fileBuffer,
                file.originalname,
                fileNames,
                orgId,
                chatflowid
            )
            await updateStorageUsage(orgId, workspaceId, totalSize, usageCacheManager)

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

            await removeSpecificFileFromUpload(file.path ?? file.key)
        }
        if (overrideConfig.vars && typeof overrideConfig.vars === 'string') {
            overrideConfig.vars = JSON.parse(overrideConfig.vars)
        }
        incomingInput = {
            ...incomingInput,
            question: '',
            overrideConfig,
            stopNodeId,
            chatId
        }
    }

    /*** Get chatflows and prepare data  ***/
    const flowData = chatflow.flowData
    const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
    const nodes = parsedFlowData.nodes
    const edges = parsedFlowData.edges

    /*** Get session ID ***/
    const memoryNode = findMemoryNode(nodes, edges)
    let sessionId = getMemorySessionId(memoryNode, incomingInput, chatId, isInternal)

    /*** Find the 1 final vector store will be upserted  ***/
    const vsNodes = nodes.filter((node) => node.data.category === 'Vector Stores')
    const vsNodesWithFileUpload = vsNodes.filter((node) => node.data.inputs?.fileUpload)
    if (vsNodesWithFileUpload.length > 1) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Multiple vector store nodes with fileUpload enabled')
    } else if (vsNodesWithFileUpload.length === 1 && !stopNodeId) {
        stopNodeId = vsNodesWithFileUpload[0].data.id
    }

    /*** Check if multiple vector store nodes exist, and if stopNodeId is specified ***/
    if (vsNodes.length > 1 && !stopNodeId) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            'There are multiple vector nodes, please provide stopNodeId in body request'
        )
    } else if (vsNodes.length === 1 && !stopNodeId) {
        stopNodeId = vsNodes[0].data.id
    } else if (!vsNodes.length && !stopNodeId) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No vector node found')
    }

    /*** Get Starting Nodes with Reversed Graph ***/
    const { graph } = constructGraphs(nodes, edges, { isReversed: true })
    const nodeIds = getAllConnectedNodes(graph, stopNodeId)
    const filteredGraph: INodeDirectedGraph = {}
    for (const key of nodeIds) {
        if (Object.prototype.hasOwnProperty.call(graph, key)) {
            filteredGraph[key] = graph[key]
        }
    }
    const { startingNodeIds, depthQueue } = getStartingNodes(filteredGraph, stopNodeId)

    /*** Get API Config ***/
    const availableVariables = await appDataSource.getRepository(Variable).findBy(getWorkspaceSearchOptions(chatflow.workspaceId))
    const { nodeOverrides, variableOverrides, apiOverrideStatus } = getAPIOverrideConfig(chatflow)

    const upsertedResult = await buildFlow({
        startingNodeIds,
        reactFlowNodes: nodes,
        reactFlowEdges: edges,
        apiMessageId,
        graph: filteredGraph,
        depthQueue,
        componentNodes,
        question,
        chatHistory,
        chatId,
        sessionId,
        chatflowid,
        appDataSource,
        usageCacheManager,
        cachePool,
        isUpsert,
        stopNodeId,
        overrideConfig,
        apiOverrideStatus,
        nodeOverrides,
        availableVariables,
        variableOverrides,
        orgId,
        workspaceId,
        subscriptionId,
        updateStorageUsage,
        checkStorage
    })

    // Save to DB
    if (upsertedResult['flowData'] && upsertedResult['result']) {
        const result = cloneDeep(upsertedResult)
        result['flowData'] = JSON.stringify(result['flowData'])
        result['result'] = JSON.stringify(omit(result['result'], ['totalKeys', 'addedDocs']))
        result.chatflowid = chatflowid
        const newUpsertHistory = new UpsertHistory()
        Object.assign(newUpsertHistory, result)
        const upsertHistory = appDataSource.getRepository(UpsertHistory).create(newUpsertHistory)
        await appDataSource.getRepository(UpsertHistory).save(upsertHistory)
    }

    await telemetry.sendTelemetry(
        'vector_upserted',
        {
            version: await getAppVersion(),
            chatlowId: chatflowid,
            type: isInternal ? ChatType.INTERNAL : ChatType.EXTERNAL,
            flowGraph: getTelemetryFlowObj(nodes, edges),
            stopNodeId
        },
        orgId
    )

    return upsertedResult['result'] ?? { result: 'Successfully Upserted' }
}

/**
 * Upsert documents
 * @param {Request} req
 * @param {boolean} isInternal
 */
export const upsertVector = async (req: Request, isInternal: boolean = false) => {
    const appServer = getRunningExpressApp()

    try {
        const chatflowid = req.params.id

        // Check if chatflow exists
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowid
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
        }

        const httpProtocol = req.get('x-forwarded-proto') || req.protocol
        const baseURL = `${httpProtocol}://${req.get('host')}`
        const incomingInput: IncomingInput = req.body
        const chatId = incomingInput.chatId ?? incomingInput.overrideConfig?.sessionId ?? uuidv4()
        const files = (req.files as Express.Multer.File[]) || []

        if (!isInternal) {
            const isKeyValidated = await validateFlowAPIKey(req, chatflow)
            if (!isKeyValidated) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
            }
        }

        // This can be public API, so we can only get orgId from the chatflow
        const chatflowWorkspaceId = chatflow.workspaceId
        const workspace = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
            id: chatflowWorkspaceId
        })
        if (!workspace) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Workspace ${chatflowWorkspaceId} not found`)
        }
        const workspaceId = workspace.id

        const org = await appServer.AppDataSource.getRepository(Organization).findOneBy({
            id: workspace.organizationId
        })
        if (!org) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization ${workspace.organizationId} not found`)
        }

        const orgId = org.id
        const subscriptionId = org.subscriptionId as string
        const productId = await appServer.identityManager.getProductIdFromSubscription(subscriptionId)

        const executeData: IExecuteFlowParams = {
            componentNodes: appServer.nodesPool.componentNodes,
            incomingInput,
            chatflow,
            chatId,
            appDataSource: appServer.AppDataSource,
            telemetry: appServer.telemetry,
            cachePool: appServer.cachePool,
            sseStreamer: appServer.sseStreamer,
            usageCacheManager: appServer.usageCacheManager,
            baseURL,
            isInternal,
            files,
            isUpsert: true,
            orgId,
            workspaceId,
            subscriptionId,
            productId
        }

        if (process.env.MODE === MODE.QUEUE) {
            const upsertQueue = appServer.queueManager.getQueue('upsert')

            const job = await upsertQueue.addJob(omit(executeData, OMIT_QUEUE_JOB_DATA))
            logger.debug(`[server]: [${orgId}]: Job added to queue: ${job.id}`)

            const queueEvents = upsertQueue.getQueueEvents()
            const result = await job.waitUntilFinished(queueEvents)

            if (!result) {
                throw new Error('Job execution failed')
            }

            appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.VECTORSTORE_UPSERT, {
                status: FLOWISE_COUNTER_STATUS.SUCCESS
            })
            return result
        } else {
            const result = await executeUpsert(executeData)

            appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.VECTORSTORE_UPSERT, {
                status: FLOWISE_COUNTER_STATUS.SUCCESS
            })
            return result
        }
    } catch (e) {
        logger.error('[server]: Error:', e)
        appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.VECTORSTORE_UPSERT, { status: FLOWISE_COUNTER_STATUS.FAILURE })

        if (e instanceof InternalFlowiseError && e.statusCode === StatusCodes.UNAUTHORIZED) {
            throw e
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, getErrorMessage(e))
        }
    }
}
