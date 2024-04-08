import { Request, Response } from 'express'
import * as fs from 'fs'
import { cloneDeep, omit } from 'lodash'
import { ICommonObject } from 'flowise-components'
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

/**
 * Upsert documents
 * @param {Request} req
 * @param {Response} res
 * @param {boolean} isInternal
 */
export const upsertVector = async (req: Request, res: Response, isInternal: boolean = false) => {
    try {
        const appServer = getRunningExpressApp()
        const chatflowid = req.params.id
        let incomingInput: IncomingInput = req.body

        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowid
        })
        if (!chatflow) return res.status(404).send(`Chatflow ${chatflowid} not found`)

        if (!isInternal) {
            const isKeyValidated = await utilValidateKey(req, chatflow)
            if (!isKeyValidated) return res.status(401).send('Unauthorized')
        }

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
                stopNodeId: req.body.stopNodeId
            }
        }

        /*** Get chatflows and prepare data  ***/
        const flowData = chatflow.flowData
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const nodes = parsedFlowData.nodes
        const edges = parsedFlowData.edges

        let stopNodeId = incomingInput?.stopNodeId ?? ''
        let chatHistory = incomingInput?.history
        let chatId = incomingInput.chatId ?? ''
        let isUpsert = true

        // Get session ID
        const memoryNode = findMemoryNode(nodes, edges)
        let sessionId = undefined
        if (memoryNode) sessionId = getMemorySessionId(memoryNode, incomingInput, chatId, isInternal)

        const vsNodes = nodes.filter(
            (node) =>
                node.data.category === 'Vector Stores' && !node.data.label.includes('Upsert') && !node.data.label.includes('Load Existing')
        )

        // Check if multiple vector store nodes exist, and if stopNodeId is specified
        if (vsNodes.length > 1 && !stopNodeId) {
            return res.status(500).send('There are multiple vector nodes, please provide stopNodeId in body request')
        } else if (vsNodes.length === 1 && !stopNodeId) {
            stopNodeId = vsNodes[0].data.id
        } else if (!vsNodes.length && !stopNodeId) {
            return res.status(500).send('No vector node found')
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
        return res.status(201).json(upsertedResult['result'] ?? { result: 'Successfully Upserted' })
    } catch (e: any) {
        logger.error('[server]: Error:', e)
        return res.status(500).send(e.message)
    }
}
