import { Request } from 'express'
import * as fs from 'fs'
import { cloneDeep, omit } from 'lodash'
import { ICommonObject, IMessage, addArrayFilesToStorage } from 'flowise-components'
import telemetryService from '../services/telemetry'
import logger from '../utils/logger'
import {
    buildFlow,
    constructGraphs,
    getAllConnectedNodes,
    mapMimeTypeToInputField,
    findMemoryNode,
    getMemorySessionId,
    getAppVersion,
    getTelemetryFlowObj,
    getStartingNodes
} from '../utils'
import { utilValidateKey } from './validateKey'
import { IncomingInput, INodeDirectedGraph, IReactFlowObject, chatType } from '../Interface'
import { ChatFlow } from '../database/entities/ChatFlow'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { UpsertHistory } from '../database/entities/UpsertHistory'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getErrorMessage } from '../errors/utils'

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
            const isKeyValidated = await utilValidateKey(req, chatflow)
            if (!isKeyValidated) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
            }
        }

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
                stopNodeId: req.body.stopNodeId
            }
        }

        /*** Get chatflows and prepare data  ***/
        const flowData = chatflow.flowData
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const nodes = parsedFlowData.nodes
        const edges = parsedFlowData.edges

        let stopNodeId = incomingInput?.stopNodeId ?? ''
        let chatHistory: IMessage[] = []
        let chatId = incomingInput.chatId ?? ''
        let isUpsert = true

        // Get session ID
        const memoryNode = findMemoryNode(nodes, edges)
        let sessionId = getMemorySessionId(memoryNode, incomingInput, chatId, isInternal)

        const vsNodes = nodes.filter(
            (node) =>
                node.data.category === 'Vector Stores' && !node.data.label.includes('Upsert') && !node.data.label.includes('Load Existing')
        )

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

        const upsertedResult = await buildFlow(
            startingNodeIds,
            nodes,
            edges,
            filteredGraph,
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
            isUpsert,
            stopNodeId
        )

        const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.data.id))

        await appServer.chatflowPool.add(chatflowid, undefined, startingNodes, incomingInput?.overrideConfig)

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

        await telemetryService.createEvent({
            name: `vector_upserted`,
            data: {
                version: await getAppVersion(),
                chatlowId: chatflowid,
                type: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                flowGraph: getTelemetryFlowObj(nodes, edges),
                stopNodeId
            }
        })

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
