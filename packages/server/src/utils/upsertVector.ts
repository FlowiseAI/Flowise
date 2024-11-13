import { Request } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import { cloneDeep, omit } from 'lodash'
import { ICommonObject, IMessage, addArrayFilesToStorage, mapMimeTypeToInputField, mapExtToInputField } from 'flowise-components'
import logger from '../utils/logger'
import {
    buildFlow,
    constructGraphs,
    getAllConnectedNodes,
    findMemoryNode,
    getMemorySessionId,
    getAppVersion,
    getTelemetryFlowObj,
    getStartingNodes
} from '../utils'
import { validateChatflowAPIKey } from './validateKey'
import { IncomingInput, INodeDirectedGraph, IReactFlowObject, ChatType } from '../Interface'
import { ChatFlow } from '../database/entities/ChatFlow'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { UpsertHistory } from '../database/entities/UpsertHistory'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getErrorMessage } from '../errors/utils'
import { v4 as uuidv4 } from 'uuid'
import { FLOWISE_COUNTER_STATUS, FLOWISE_METRIC_COUNTERS } from '../Interface.Metrics'
/**
 * Upsert documents
 * @param {Request} req
 * @param {boolean} isInternal
 */
export const upsertVector = async (req: Request, isInternal: boolean = false) => {
    try {
        const appServer = getRunningExpressApp()
        const chatflowid = req.params.id
        let incomingInput: IncomingInput = req.body

        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowid
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
        }

        if (!isInternal) {
            const isKeyValidated = await validateChatflowAPIKey(req, chatflow)
            if (!isKeyValidated) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
            }
        }

        const files = (req.files as Express.Multer.File[]) || []

        if (files.length) {
            const overrideConfig: ICommonObject = { ...req.body }
            for (const file of files) {
                const fileNames: string[] = []
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
                question: req.body.question ?? 'hello',
                overrideConfig,
                stopNodeId: req.body.stopNodeId
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

        const apiMessageId = req.body.apiMessageId ?? uuidv4()

        let stopNodeId = incomingInput?.stopNodeId ?? ''
        let chatHistory: IMessage[] = []
        let chatId = incomingInput.chatId ?? ''
        let isUpsert = true

        // Get session ID
        const memoryNode = findMemoryNode(nodes, edges)
        let sessionId = getMemorySessionId(memoryNode, incomingInput, chatId, isInternal)

        const vsNodes = nodes.filter((node) => node.data.category === 'Vector Stores')

        // Get StopNodeId for vector store which has fielUpload
        const vsNodesWithFileUpload = vsNodes.filter((node) => node.data.inputs?.fileUpload)
        if (vsNodesWithFileUpload.length > 1) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Multiple vector store nodes with fileUpload enabled')
        } else if (vsNodesWithFileUpload.length === 1 && !stopNodeId) {
            stopNodeId = vsNodesWithFileUpload[0].data.id
        }

        // Check if multiple vector store nodes exist, and if stopNodeId is specified
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

        const { graph } = constructGraphs(nodes, edges, { isReversed: true })

        const nodeIds = getAllConnectedNodes(graph, stopNodeId)

        const filteredGraph: INodeDirectedGraph = {}
        for (const key of nodeIds) {
            if (Object.prototype.hasOwnProperty.call(graph, key)) {
                filteredGraph[key] = graph[key]
            }
        }

        const { startingNodeIds, depthQueue } = getStartingNodes(filteredGraph, stopNodeId)

        const upsertedResult = await buildFlow({
            startingNodeIds,
            reactFlowNodes: nodes,
            reactFlowEdges: edges,
            apiMessageId,
            graph: filteredGraph,
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
            isUpsert,
            stopNodeId
        })

        const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.data.id))

        await appServer.chatflowPool.add(chatflowid, undefined, startingNodes, incomingInput?.overrideConfig, chatId)

        // Save to DB
        if (upsertedResult['flowData'] && upsertedResult['result']) {
            const result = cloneDeep(upsertedResult)
            result['flowData'] = JSON.stringify(result['flowData'])
            result['result'] = JSON.stringify(omit(result['result'], ['totalKeys', 'addedDocs']))
            result.chatflowid = chatflowid
            const newUpsertHistory = new UpsertHistory()
            Object.assign(newUpsertHistory, result)
            const upsertHistory = appServer.AppDataSource.getRepository(UpsertHistory).create(newUpsertHistory)
            await appServer.AppDataSource.getRepository(UpsertHistory).save(upsertHistory)
        }

        await appServer.telemetry.sendTelemetry('vector_upserted', {
            version: await getAppVersion(),
            chatlowId: chatflowid,
            type: isInternal ? ChatType.INTERNAL : ChatType.EXTERNAL,
            flowGraph: getTelemetryFlowObj(nodes, edges),
            stopNodeId
        })
        appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.VECTORSTORE_UPSERT, { status: FLOWISE_COUNTER_STATUS.SUCCESS })

        return upsertedResult['result'] ?? { result: 'Successfully Upserted' }
    } catch (e) {
        logger.error('[server]: Error:', e)
        if (e instanceof InternalFlowiseError && e.statusCode === StatusCodes.UNAUTHORIZED) {
            throw e
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, getErrorMessage(e))
        }
    }
}
