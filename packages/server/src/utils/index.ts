/**
 * Strictly no getRepository, appServer here, must be passed as parameter
 */

import path from 'path'
import fs from 'fs'
import logger from './logger'
import { v4 as uuidv4 } from 'uuid'
import {
    IChatFlow,
    IComponentCredentials,
    IComponentNodes,
    ICredentialDataDecrypted,
    ICredentialReqBody,
    IDepthQueue,
    IExploredNode,
    INodeData,
    INodeDependencies,
    INodeDirectedGraph,
    INodeOverrides,
    INodeQueue,
    IOverrideConfig,
    IReactFlowEdge,
    IReactFlowNode,
    IVariable,
    IVariableDict,
    IVariableOverride,
    IncomingInput
} from '../Interface'
import { cloneDeep, get, isEqual } from 'lodash'
import {
    convertChatHistoryToText,
    getInputVariables,
    handleEscapeCharacters,
    getEncryptionKeyPath,
    ICommonObject,
    IDatabaseEntity,
    IMessage,
    FlowiseMemory,
    IFileUpload,
    getS3Config
} from 'flowise-components'
import { randomBytes } from 'crypto'
import { AES, enc } from 'crypto-js'
import multer from 'multer'
import multerS3 from 'multer-s3'
import MulterGoogleCloudStorage from 'multer-cloud-storage'
import { ChatFlow } from '../database/entities/ChatFlow'
import { ChatMessage } from '../database/entities/ChatMessage'
import { Credential } from '../database/entities/Credential'
import { Tool } from '../database/entities/Tool'
import { Assistant } from '../database/entities/Assistant'
import { Lead } from '../database/entities/Lead'
import { DataSource } from 'typeorm'
import { CachePool } from '../CachePool'
import { Variable } from '../database/entities/Variable'
import { DocumentStore } from '../database/entities/DocumentStore'
import { DocumentStoreFileChunk } from '../database/entities/DocumentStoreFileChunk'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import {
    CreateSecretCommand,
    GetSecretValueCommand,
    SecretsManagerClient,
    SecretsManagerClientConfig
} from '@aws-sdk/client-secrets-manager'

export const QUESTION_VAR_PREFIX = 'question'
export const FILE_ATTACHMENT_PREFIX = 'file_attachment'
export const CHAT_HISTORY_VAR_PREFIX = 'chat_history'
export const RUNTIME_MESSAGES_LENGTH_VAR_PREFIX = 'runtime_messages_length'
export const LOOP_COUNT_VAR_PREFIX = 'loop_count'
export const CURRENT_DATE_TIME_VAR_PREFIX = 'current_date_time'
export const REDACTED_CREDENTIAL_VALUE = '_FLOWISE_BLANK_07167752-1a71-43b1-bf8f-4f32252165db'

let secretsManagerClient: SecretsManagerClient | null = null
const USE_AWS_SECRETS_MANAGER = process.env.SECRETKEY_STORAGE_TYPE === 'aws'
if (USE_AWS_SECRETS_MANAGER) {
    const region = process.env.SECRETKEY_AWS_REGION || 'us-east-1' // Default region if not provided
    const accessKeyId = process.env.SECRETKEY_AWS_ACCESS_KEY
    const secretAccessKey = process.env.SECRETKEY_AWS_SECRET_KEY

    const secretManagerConfig: SecretsManagerClientConfig = {
        region: region
    }

    if (accessKeyId && secretAccessKey) {
        secretManagerConfig.credentials = {
            accessKeyId,
            secretAccessKey
        }
    }
    secretsManagerClient = new SecretsManagerClient(secretManagerConfig)
}

export const databaseEntities: IDatabaseEntity = {
    ChatFlow: ChatFlow,
    ChatMessage: ChatMessage,
    Tool: Tool,
    Credential: Credential,
    Lead: Lead,
    Assistant: Assistant,
    Variable: Variable,
    DocumentStore: DocumentStore,
    DocumentStoreFileChunk: DocumentStoreFileChunk
}

/**
 * Returns the home folder path of the user if
 * none can be found it falls back to the current
 * working directory
 *
 */
export const getUserHome = (): string => {
    let variableName = 'HOME'
    if (process.platform === 'win32') {
        variableName = 'USERPROFILE'
    }

    if (process.env[variableName] === undefined) {
        // If for some reason the variable does not exist
        // fall back to current folder
        return process.cwd()
    }
    return process.env[variableName] as string
}

/**
 * Returns the path of node modules package
 * @param {string} packageName
 * @returns {string}
 */
export const getNodeModulesPackagePath = (packageName: string): string => {
    const checkPaths = [
        path.join(__dirname, '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', '..', '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', '..', '..', '..', 'node_modules', packageName)
    ]
    for (const checkPath of checkPaths) {
        if (fs.existsSync(checkPath)) {
            return checkPath
        }
    }
    return ''
}

/**
 * Construct graph and node dependencies score
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {IReactFlowEdge[]} reactFlowEdges
 * @param {{ isNonDirected?: boolean, isReversed?: boolean }} options
 */
export const constructGraphs = (
    reactFlowNodes: IReactFlowNode[],
    reactFlowEdges: IReactFlowEdge[],
    options?: { isNonDirected?: boolean; isReversed?: boolean }
) => {
    const nodeDependencies = {} as INodeDependencies
    const graph = {} as INodeDirectedGraph

    for (let i = 0; i < reactFlowNodes.length; i += 1) {
        const nodeId = reactFlowNodes[i].id
        nodeDependencies[nodeId] = 0
        graph[nodeId] = []
    }

    if (options && options.isReversed) {
        for (let i = 0; i < reactFlowEdges.length; i += 1) {
            const source = reactFlowEdges[i].source
            const target = reactFlowEdges[i].target

            if (Object.prototype.hasOwnProperty.call(graph, target)) {
                graph[target].push(source)
            } else {
                graph[target] = [source]
            }

            nodeDependencies[target] += 1
        }

        return { graph, nodeDependencies }
    }

    for (let i = 0; i < reactFlowEdges.length; i += 1) {
        const source = reactFlowEdges[i].source
        const target = reactFlowEdges[i].target

        if (Object.prototype.hasOwnProperty.call(graph, source)) {
            graph[source].push(target)
        } else {
            graph[source] = [target]
        }

        if (options && options.isNonDirected) {
            if (Object.prototype.hasOwnProperty.call(graph, target)) {
                graph[target].push(source)
            } else {
                graph[target] = [source]
            }
        }
        nodeDependencies[target] += 1
    }

    return { graph, nodeDependencies }
}

/**
 * Get starting node and check if flow is valid
 * @param {INodeDependencies} nodeDependencies
 */
export const getStartingNode = (nodeDependencies: INodeDependencies) => {
    // Find starting node
    const startingNodeIds = [] as string[]
    Object.keys(nodeDependencies).forEach((nodeId) => {
        if (nodeDependencies[nodeId] === 0) {
            startingNodeIds.push(nodeId)
        }
    })

    return { startingNodeIds }
}

/**
 * Get starting nodes and check if flow is valid
 * @param {INodeDependencies} graph
 * @param {string} endNodeId
 */
export const getStartingNodes = (graph: INodeDirectedGraph, endNodeId: string) => {
    const depthQueue: IDepthQueue = {
        [endNodeId]: 0
    }

    // Assuming that this is a directed acyclic graph, there will be no infinite loop problem.
    const walkGraph = (nodeId: string) => {
        const depth = depthQueue[nodeId]
        graph[nodeId].flatMap((id) => {
            depthQueue[id] = Math.max(depthQueue[id] ?? 0, depth + 1)
            walkGraph(id)
        })
    }

    walkGraph(endNodeId)

    const maxDepth = Math.max(...Object.values(depthQueue))
    const depthQueueReversed: IDepthQueue = {}
    for (const nodeId in depthQueue) {
        if (Object.prototype.hasOwnProperty.call(depthQueue, nodeId)) {
            depthQueueReversed[nodeId] = Math.abs(depthQueue[nodeId] - maxDepth)
        }
    }

    const startingNodeIds = Object.entries(depthQueueReversed)
        .filter(([_, depth]) => depth === 0)
        .map(([id, _]) => id)

    return { startingNodeIds, depthQueue: depthQueueReversed }
}

/**
 * Get all connected nodes from startnode
 * @param {INodeDependencies} graph
 * @param {string} startNodeId
 */
export const getAllConnectedNodes = (graph: INodeDirectedGraph, startNodeId: string) => {
    const visited = new Set<string>()
    const queue: Array<[string]> = [[startNodeId]]

    while (queue.length > 0) {
        const [currentNode] = queue.shift()!

        if (visited.has(currentNode)) {
            continue
        }

        visited.add(currentNode)

        for (const neighbor of graph[currentNode]) {
            if (!visited.has(neighbor)) {
                queue.push([neighbor])
            }
        }
    }

    return [...visited]
}

/**
 * Get ending node and check if flow is valid
 * @param {INodeDependencies} nodeDependencies
 * @param {INodeDirectedGraph} graph
 * @param {IReactFlowNode[]} allNodes
 */
export const getEndingNodes = (
    nodeDependencies: INodeDependencies,
    graph: INodeDirectedGraph,
    allNodes: IReactFlowNode[]
): IReactFlowNode[] => {
    const endingNodeIds: string[] = []
    Object.keys(graph).forEach((nodeId) => {
        if (Object.keys(nodeDependencies).length === 1) {
            endingNodeIds.push(nodeId)
        } else if (!graph[nodeId].length && nodeDependencies[nodeId] > 0) {
            endingNodeIds.push(nodeId)
        }
    })

    let endingNodes = allNodes.filter((nd) => endingNodeIds.includes(nd.id))

    // If there are multiple endingnodes, the failed ones will be automatically ignored.
    // And only ensure that at least one can pass the verification.
    const verifiedEndingNodes: typeof endingNodes = []
    let error: InternalFlowiseError | null = null
    for (const endingNode of endingNodes) {
        const endingNodeData = endingNode.data
        if (!endingNodeData) {
            error = new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Ending node ${endingNode.id} data not found`)

            continue
        }

        const isEndingNode = endingNodeData?.outputs?.output === 'EndingNode'

        if (!isEndingNode) {
            if (
                endingNodeData &&
                endingNodeData.category !== 'Chains' &&
                endingNodeData.category !== 'Agents' &&
                endingNodeData.category !== 'Engine' &&
                endingNodeData.category !== 'Multi Agents' &&
                endingNodeData.category !== 'Sequential Agents'
            ) {
                error = new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Ending node must be either a Chain or Agent or Engine`)
                continue
            }
        }
        verifiedEndingNodes.push(endingNode)
    }

    if (verifiedEndingNodes.length > 0) {
        return verifiedEndingNodes
    }

    if (endingNodes.length === 0 || error === null) {
        error = new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Ending nodes not found`)
    }

    throw error
}

/**
 * Get file name from base64 string
 * @param {string} fileBase64
 */
export const getFileName = (fileBase64: string): string => {
    let fileNames = []
    if (fileBase64.startsWith('FILE-STORAGE::')) {
        const names = fileBase64.substring(14)
        if (names.includes('[') && names.includes(']')) {
            const files = JSON.parse(names)
            return files.join(', ')
        } else {
            return fileBase64.substring(14)
        }
    }
    if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
        const files = JSON.parse(fileBase64)
        for (const file of files) {
            const splitDataURI = file.split(',')
            const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
            fileNames.push(filename)
        }
        return fileNames.join(', ')
    } else {
        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
        return filename
    }
}

/**
 * Save upsert flowData
 * @param {INodeData} nodeData
 * @param {Record<string, any>} upsertHistory
 */
export const saveUpsertFlowData = (nodeData: INodeData, upsertHistory: Record<string, any>): ICommonObject[] => {
    const existingUpsertFlowData = upsertHistory['flowData'] ?? []
    const paramValues: ICommonObject[] = []

    for (const input in nodeData.inputs) {
        const inputParam = nodeData.inputParams.find((inp) => inp.name === input)
        if (!inputParam) continue

        let paramValue: ICommonObject = {}

        if (!nodeData.inputs[input]) {
            continue
        }
        if (
            typeof nodeData.inputs[input] === 'string' &&
            nodeData.inputs[input].startsWith('{{') &&
            nodeData.inputs[input].endsWith('}}')
        ) {
            continue
        }
        // Get file name instead of the base64 string
        if (nodeData.category === 'Document Loaders' && nodeData.inputParams.find((inp) => inp.name === input)?.type === 'file') {
            paramValue = {
                label: inputParam?.label,
                name: inputParam?.name,
                type: inputParam?.type,
                value: getFileName(nodeData.inputs[input])
            }
            paramValues.push(paramValue)
            continue
        }

        paramValue = {
            label: inputParam?.label,
            name: inputParam?.name,
            type: inputParam?.type,
            value: nodeData.inputs[input]
        }
        paramValues.push(paramValue)
    }

    const newFlowData = {
        label: nodeData.label,
        name: nodeData.name,
        category: nodeData.category,
        id: nodeData.id,
        paramValues
    }
    existingUpsertFlowData.push(newFlowData)
    return existingUpsertFlowData
}

/**
 * Check if doc loader should be bypassed, ONLY if doc loader is connected to a vector store
 * Reason being we dont want to load the doc loader again whenever we are building the flow, because it was already done during upserting
 * EXCEPT if the vector store is a memory vector store
 * TODO: Remove this logic when we remove doc loader nodes from the canvas
 * @param {IReactFlowNode} reactFlowNode
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {IReactFlowEdge[]} reactFlowEdges
 * @returns {boolean}
 */
const checkIfDocLoaderShouldBeIgnored = (
    reactFlowNode: IReactFlowNode,
    reactFlowNodes: IReactFlowNode[],
    reactFlowEdges: IReactFlowEdge[]
): boolean => {
    let outputId = ''

    if (reactFlowNode.data.outputAnchors.length) {
        if (Object.keys(reactFlowNode.data.outputs || {}).length) {
            const output = reactFlowNode.data.outputs?.output
            const node = reactFlowNode.data.outputAnchors[0].options?.find((anchor) => anchor.name === output)
            if (node) outputId = (node as ICommonObject).id
        } else {
            outputId = (reactFlowNode.data.outputAnchors[0] as ICommonObject).id
        }
    }

    const targetNodeId = reactFlowEdges.find((edge) => edge.sourceHandle === outputId)?.target

    if (targetNodeId) {
        const targetNodeCategory = reactFlowNodes.find((nd) => nd.id === targetNodeId)?.data.category || ''
        const targetNodeName = reactFlowNodes.find((nd) => nd.id === targetNodeId)?.data.name || ''
        if (targetNodeCategory === 'Vector Stores' && targetNodeName !== 'memoryVectorStore') {
            return true
        }
    }

    return false
}

type BuildFlowParams = {
    startingNodeIds: string[]
    reactFlowNodes: IReactFlowNode[]
    reactFlowEdges: IReactFlowEdge[]
    graph: INodeDirectedGraph
    depthQueue: IDepthQueue
    componentNodes: IComponentNodes
    question: string
    chatHistory: IMessage[]
    chatId: string
    sessionId: string
    chatflowid: string
    apiMessageId: string
    appDataSource: DataSource
    overrideConfig?: ICommonObject
    apiOverrideStatus?: boolean
    nodeOverrides?: INodeOverrides
    availableVariables?: IVariable[]
    variableOverrides?: IVariableOverride[]
    cachePool?: CachePool
    isUpsert?: boolean
    stopNodeId?: string
    uploads?: IFileUpload[]
    baseURL?: string
    orgId?: string
    workspaceId?: string
    subscriptionId?: string
    usageCacheManager?: any
    uploadedFilesContent?: string
    updateStorageUsage?: (orgId: string, workspaceId: string, totalSize: number, usageCacheManager?: any) => void
    checkStorage?: (orgId: string, subscriptionId: string, usageCacheManager: any) => Promise<any>
}

/**
 * Build flow from start to end
 * @param {BuildFlowParams} params
 */
export const buildFlow = async ({
    startingNodeIds,
    reactFlowNodes,
    reactFlowEdges,
    graph,
    depthQueue,
    componentNodes,
    question,
    uploadedFilesContent,
    chatHistory,
    apiMessageId,
    chatId,
    sessionId,
    chatflowid,
    appDataSource,
    overrideConfig,
    apiOverrideStatus = false,
    nodeOverrides = {},
    availableVariables = [],
    variableOverrides = [],
    cachePool,
    isUpsert,
    stopNodeId,
    uploads,
    baseURL,
    orgId,
    workspaceId,
    subscriptionId,
    usageCacheManager,
    updateStorageUsage,
    checkStorage
}: BuildFlowParams) => {
    const flowNodes = cloneDeep(reactFlowNodes)

    let upsertHistory: Record<string, any> = {}

    // Create a Queue and add our initial node in it
    const nodeQueue = [] as INodeQueue[]
    const exploredNode = {} as IExploredNode
    const dynamicVariables = {} as Record<string, unknown>
    let ignoreNodeIds: string[] = []

    // In the case of infinite loop, only max 3 loops will be executed
    const maxLoop = 3

    for (let i = 0; i < startingNodeIds.length; i += 1) {
        nodeQueue.push({ nodeId: startingNodeIds[i], depth: 0 })
        exploredNode[startingNodeIds[i]] = { remainingLoop: maxLoop, lastSeenDepth: 0 }
    }

    const initializedNodes: Set<string> = new Set()
    const reversedGraph = constructGraphs(reactFlowNodes, reactFlowEdges, { isReversed: true }).graph

    const flowData: ICommonObject = {
        chatflowid,
        chatId,
        sessionId,
        chatHistory,
        ...overrideConfig
    }
    while (nodeQueue.length) {
        const { nodeId, depth } = nodeQueue.shift() as INodeQueue

        const reactFlowNode = flowNodes.find((nd) => nd.id === nodeId)
        const nodeIndex = flowNodes.findIndex((nd) => nd.id === nodeId)
        if (!reactFlowNode || reactFlowNode === undefined || nodeIndex < 0) continue

        try {
            const nodeInstanceFilePath = componentNodes[reactFlowNode.data.name].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const newNodeInstance = new nodeModule.nodeClass()

            let flowNodeData = cloneDeep(reactFlowNode.data)

            // Only override the config if its status is true
            if (overrideConfig && apiOverrideStatus) {
                flowNodeData = replaceInputsWithConfig(flowNodeData, overrideConfig, nodeOverrides, variableOverrides)
            }

            if (isUpsert) upsertHistory['flowData'] = saveUpsertFlowData(flowNodeData, upsertHistory)

            const reactFlowNodeData: INodeData = await resolveVariables(
                flowNodeData,
                flowNodes,
                question,
                chatHistory,
                flowData,
                uploadedFilesContent,
                availableVariables,
                variableOverrides
            )

            if (isUpsert && stopNodeId && nodeId === stopNodeId) {
                logger.debug(`[server]: [${orgId}]: Upserting ${reactFlowNode.data.label} (${reactFlowNode.data.id})`)
                const indexResult = await newNodeInstance.vectorStoreMethods!['upsert']!.call(newNodeInstance, reactFlowNodeData, {
                    orgId,
                    workspaceId,
                    subscriptionId,
                    chatId,
                    sessionId,
                    chatflowid,
                    chatHistory,
                    apiMessageId,
                    logger,
                    appDataSource,
                    databaseEntities,
                    cachePool,
                    usageCacheManager,
                    dynamicVariables,
                    uploads,
                    baseURL
                })
                if (indexResult) upsertHistory['result'] = indexResult
                logger.debug(`[server]: [${orgId}]: Finished upserting ${reactFlowNode.data.label} (${reactFlowNode.data.id})`)
                break
            } else if (
                !isUpsert &&
                reactFlowNode.data.category === 'Document Loaders' &&
                checkIfDocLoaderShouldBeIgnored(reactFlowNode, reactFlowNodes, reactFlowEdges)
            ) {
                initializedNodes.add(nodeId)
            } else {
                logger.debug(`[server]: [${orgId}]: Initializing ${reactFlowNode.data.label} (${reactFlowNode.data.id})`)
                const finalQuestion = uploadedFilesContent ? `${uploadedFilesContent}\n\n${question}` : question
                let outputResult = await newNodeInstance.init(reactFlowNodeData, finalQuestion, {
                    orgId,
                    workspaceId,
                    subscriptionId,
                    chatId,
                    sessionId,
                    chatflowid,
                    chatHistory,
                    logger,
                    appDataSource,
                    databaseEntities,
                    cachePool,
                    usageCacheManager,
                    isUpsert,
                    dynamicVariables,
                    uploads,
                    baseURL,
                    componentNodes,
                    updateStorageUsage,
                    checkStorage
                })

                // Save dynamic variables
                if (reactFlowNode.data.name === 'setVariable') {
                    const dynamicVars = outputResult?.dynamicVariables ?? {}

                    for (const variableKey in dynamicVars) {
                        dynamicVariables[variableKey] = dynamicVars[variableKey]
                    }

                    outputResult = outputResult?.output
                }

                // Determine which nodes to route next when it comes to ifElse
                if (reactFlowNode.data.name === 'ifElseFunction' && typeof outputResult === 'object') {
                    let sourceHandle = ''
                    if (outputResult.type === true) {
                        // sourceHandle = `${nodeId}-output-returnFalse-string|number|boolean|json|array`
                        sourceHandle = (
                            reactFlowNode.data.outputAnchors.flatMap((n) => n.options).find((n) => n?.name === 'returnFalse') as any
                        )?.id
                    } else if (outputResult.type === false) {
                        // sourceHandle = `${nodeId}-output-returnTrue-string|number|boolean|json|array`
                        sourceHandle = (
                            reactFlowNode.data.outputAnchors.flatMap((n) => n.options).find((n) => n?.name === 'returnTrue') as any
                        )?.id
                    }

                    const ifElseEdge = reactFlowEdges.find((edg) => edg.source === nodeId && edg.sourceHandle === sourceHandle)
                    if (ifElseEdge) {
                        const { graph } = constructGraphs(
                            reactFlowNodes,
                            reactFlowEdges.filter((edg) => !(edg.source === nodeId && edg.sourceHandle === sourceHandle)),
                            { isNonDirected: true }
                        )
                        ignoreNodeIds.push(ifElseEdge.target, ...getAllConnectedNodes(graph, ifElseEdge.target))
                        ignoreNodeIds = [...new Set(ignoreNodeIds)]
                    }

                    outputResult = outputResult?.output
                }

                flowNodes[nodeIndex].data.instance = outputResult

                logger.debug(`[server]: [${orgId}]: Finished initializing ${reactFlowNode.data.label} (${reactFlowNode.data.id})`)
                initializedNodes.add(reactFlowNode.data.id)
            }
        } catch (e: any) {
            logger.error(`[server]: [${orgId}]:`, e)
            throw new Error(e)
        }

        let neighbourNodeIds = graph[nodeId]
        const nextDepth = depth + 1

        // Find other nodes that are on the same depth level
        const sameDepthNodeIds = Object.keys(depthQueue).filter((key) => depthQueue[key] === nextDepth)

        for (const id of sameDepthNodeIds) {
            if (neighbourNodeIds.includes(id)) continue
            neighbourNodeIds.push(id)
        }

        neighbourNodeIds = neighbourNodeIds.filter((neigh) => !ignoreNodeIds.includes(neigh))

        for (let i = 0; i < neighbourNodeIds.length; i += 1) {
            const neighNodeId = neighbourNodeIds[i]
            if (ignoreNodeIds.includes(neighNodeId)) continue
            if (initializedNodes.has(neighNodeId)) continue
            if (reversedGraph[neighNodeId].some((dependId) => !initializedNodes.has(dependId))) continue
            // If nodeId has been seen, cycle detected
            if (Object.prototype.hasOwnProperty.call(exploredNode, neighNodeId)) {
                const { remainingLoop, lastSeenDepth } = exploredNode[neighNodeId]

                if (lastSeenDepth === nextDepth) continue

                if (remainingLoop === 0) {
                    break
                }
                const remainingLoopMinusOne = remainingLoop - 1
                exploredNode[neighNodeId] = { remainingLoop: remainingLoopMinusOne, lastSeenDepth: nextDepth }
                nodeQueue.push({ nodeId: neighNodeId, depth: nextDepth })
            } else {
                exploredNode[neighNodeId] = { remainingLoop: maxLoop, lastSeenDepth: nextDepth }
                nodeQueue.push({ nodeId: neighNodeId, depth: nextDepth })
            }
        }

        // Move end node to last
        if (!neighbourNodeIds.length) {
            const index = flowNodes.findIndex((nd) => nd.data.id === nodeId)
            flowNodes.push(flowNodes.splice(index, 1)[0])
        }
    }
    return isUpsert ? (upsertHistory as any) : flowNodes
}

/**
 * Clear session memories
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {IComponentNodes} componentNodes
 * @param {string} chatId
 * @param {DataSource} appDataSource
 * @param {string} sessionId
 * @param {string} memoryType
 * @param {string} isClearFromViewMessageDialog
 */
export const clearSessionMemory = async (
    reactFlowNodes: IReactFlowNode[],
    componentNodes: IComponentNodes,
    chatId: string,
    appDataSource: DataSource,
    orgId?: string,
    sessionId?: string,
    memoryType?: string,
    isClearFromViewMessageDialog?: string
) => {
    for (const node of reactFlowNodes) {
        if (node.data.category !== 'Memory' && node.data.type !== 'OpenAIAssistant') continue

        // Only clear specific session memory from View Message Dialog UI
        if (isClearFromViewMessageDialog && memoryType && node.data.label !== memoryType) continue

        const nodeInstanceFilePath = componentNodes[node.data.name].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newNodeInstance = new nodeModule.nodeClass()
        const options: ICommonObject = { orgId, chatId, appDataSource, databaseEntities, logger }

        // SessionId always take priority first because it is the sessionId used for 3rd party memory node
        if (sessionId && node.data.inputs) {
            if (node.data.type === 'OpenAIAssistant') {
                await newNodeInstance.clearChatMessages(node.data, options, { type: 'threadId', id: sessionId })
            } else {
                node.data.inputs.sessionId = sessionId
                const initializedInstance: FlowiseMemory = await newNodeInstance.init(node.data, '', options)
                await initializedInstance.clearChatMessages(sessionId)
            }
        } else if (chatId && node.data.inputs) {
            if (node.data.type === 'OpenAIAssistant') {
                await newNodeInstance.clearChatMessages(node.data, options, { type: 'chatId', id: chatId })
            } else {
                node.data.inputs.sessionId = chatId
                const initializedInstance: FlowiseMemory = await newNodeInstance.init(node.data, '', options)
                await initializedInstance.clearChatMessages(chatId)
            }
        }
    }
}

export const getGlobalVariable = async (
    overrideConfig?: ICommonObject,
    availableVariables: IVariable[] = [],
    variableOverrides: ICommonObject[] = []
) => {
    // override variables defined in overrideConfig
    // nodeData.inputs.vars is an Object, check each property and override the variable
    if (overrideConfig?.vars && variableOverrides) {
        for (const propertyName of Object.getOwnPropertyNames(overrideConfig.vars)) {
            // Check if this variable is enabled for override
            const override = variableOverrides.find((v) => v.name === propertyName)
            if (!override?.enabled) {
                continue // Skip this variable if it's not enabled for override
            }

            const foundVar = availableVariables.find((v) => v.name === propertyName)
            if (foundVar) {
                // even if the variable was defined as runtime, we override it with static value
                foundVar.type = 'static'
                foundVar.value = overrideConfig.vars[propertyName]
            } else {
                // add it the variables, if not found locally in the db
                availableVariables.push({
                    name: propertyName,
                    type: 'static',
                    value: overrideConfig.vars[propertyName],
                    id: '',
                    updatedDate: new Date(),
                    createdDate: new Date(),
                    workspaceId: ''
                })
            }
        }
    }

    let vars = {}
    if (availableVariables.length) {
        for (const item of availableVariables) {
            let value = item.value

            // read from .env file
            if (item.type === 'runtime') {
                value = process.env[item.name] ?? ''
            }

            Object.defineProperty(vars, item.name, {
                enumerable: true,
                configurable: true,
                writable: true,
                value: value
            })
        }
    }
    return vars
}

/**
 * Get variable value from outputResponses.output
 * @param {string} paramValue
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {string} question
 * @param {boolean} isAcceptVariable
 * @returns {string}
 */
export const getVariableValue = async (
    paramValue: string | object,
    reactFlowNodes: IReactFlowNode[],
    question: string,
    chatHistory: IMessage[],
    isAcceptVariable = false,
    flowConfig?: ICommonObject,
    uploadedFilesContent?: string,
    availableVariables: IVariable[] = [],
    variableOverrides: ICommonObject[] = []
) => {
    const isObject = typeof paramValue === 'object'
    const initialValue = (isObject ? JSON.stringify(paramValue) : paramValue) ?? ''
    let returnVal = initialValue
    const variableStack = []
    const variableDict = {} as IVariableDict
    let startIdx = 0
    const endIdx = initialValue.length - 1

    while (startIdx < endIdx) {
        const substr = initialValue.substring(startIdx, startIdx + 2)

        // Store the opening double curly bracket
        if (substr === '{{') {
            variableStack.push({ substr, startIdx: startIdx + 2 })
        }

        // Found the complete variable
        if (substr === '}}' && variableStack.length > 0 && variableStack[variableStack.length - 1].substr === '{{') {
            const variableStartIdx = variableStack[variableStack.length - 1].startIdx
            const variableEndIdx = startIdx
            const variableFullPath = initialValue.substring(variableStartIdx, variableEndIdx)

            /**
             * Apply string transformation to convert special chars:
             * FROM: hello i am ben\n\n\thow are you?
             * TO: hello i am benFLOWISE_NEWLINEFLOWISE_NEWLINEFLOWISE_TABhow are you?
             */
            if (isAcceptVariable && variableFullPath === QUESTION_VAR_PREFIX) {
                variableDict[`{{${variableFullPath}}}`] = handleEscapeCharacters(question, false)
            }

            if (isAcceptVariable && variableFullPath === FILE_ATTACHMENT_PREFIX) {
                variableDict[`{{${variableFullPath}}}`] = handleEscapeCharacters(uploadedFilesContent, false)
            }

            if (isAcceptVariable && variableFullPath === CHAT_HISTORY_VAR_PREFIX) {
                variableDict[`{{${variableFullPath}}}`] = handleEscapeCharacters(convertChatHistoryToText(chatHistory), false)
            }

            if (variableFullPath.startsWith('$vars.')) {
                const vars = await getGlobalVariable(flowConfig, availableVariables, variableOverrides)
                const variableValue = get(vars, variableFullPath.replace('$vars.', ''))
                if (variableValue != null) {
                    variableDict[`{{${variableFullPath}}}`] = variableValue
                    returnVal = returnVal.split(`{{${variableFullPath}}}`).join(variableValue)
                }
            }

            if (variableFullPath.startsWith('$flow.') && flowConfig) {
                const variableValue = get(flowConfig, variableFullPath.replace('$flow.', ''))
                if (variableValue != null) {
                    variableDict[`{{${variableFullPath}}}`] = variableValue
                    returnVal = returnVal.split(`{{${variableFullPath}}}`).join(variableValue)
                }
            }

            // Resolve values with following case.
            // 1: <variableNodeId>.data.instance
            // 2: <variableNodeId>.data.instance.pathtokey
            const variableFullPathParts = variableFullPath.split('.')
            const variableNodeId = variableFullPathParts[0]
            const executedNode = reactFlowNodes.find((nd) => nd.id === variableNodeId)
            if (executedNode) {
                let variableValue = get(executedNode.data, 'instance')

                // Handle path such as `<variableNodeId>.data.instance.key`
                if (variableFullPathParts.length > 3) {
                    let variableObj = null
                    switch (typeof variableValue) {
                        case 'string': {
                            const unEscapedVariableValue = handleEscapeCharacters(variableValue, true)
                            if (unEscapedVariableValue.startsWith('{') && unEscapedVariableValue.endsWith('}')) {
                                try {
                                    variableObj = JSON.parse(unEscapedVariableValue)
                                } catch (e) {
                                    // ignore
                                }
                            }
                            break
                        }
                        case 'object': {
                            variableObj = variableValue
                            break
                        }
                        default:
                            break
                    }
                    if (variableObj) {
                        variableObj = get(variableObj, variableFullPathParts.slice(3))
                        variableValue = handleEscapeCharacters(
                            typeof variableObj === 'object' ? JSON.stringify(variableObj) : variableObj,
                            false
                        )
                    }
                }
                if (isAcceptVariable) {
                    variableDict[`{{${variableFullPath}}}`] = variableValue
                } else {
                    returnVal = variableValue
                }
            }
            variableStack.pop()
        }
        startIdx += 1
    }

    if (isAcceptVariable) {
        const variablePaths = Object.keys(variableDict)
        variablePaths.sort() // Sort by length of variable path because longer path could possibly contains nested variable
        variablePaths.forEach((path) => {
            let variableValue: object | string = variableDict[path]
            // Replace all occurrence
            if (typeof variableValue === 'object') {
                // Just get the id of variableValue object if it is agentflow node, to avoid circular JSON error
                if (Object.prototype.hasOwnProperty.call(variableValue, 'predecessorAgents')) {
                    const nodeId = variableValue['id']
                    variableValue = { id: nodeId }
                }

                const stringifiedValue = JSON.stringify(JSON.stringify(variableValue))
                if (stringifiedValue.startsWith('"') && stringifiedValue.endsWith('"')) {
                    // get rid of the double quotes
                    returnVal = returnVal.split(path).join(stringifiedValue.substring(1, stringifiedValue.length - 1))
                } else {
                    returnVal = returnVal.split(path).join(JSON.stringify(variableValue).replace(/"/g, '\\"'))
                }
            } else {
                returnVal = returnVal.split(path).join(variableValue)
            }
        })
        return returnVal
    }
    return isObject ? JSON.parse(returnVal) : returnVal
}

/**
 * Loop through each inputs and resolve variable if necessary
 * @param {INodeData} reactFlowNodeData
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {string} question
 * @returns {INodeData}
 */
export const resolveVariables = async (
    reactFlowNodeData: INodeData,
    reactFlowNodes: IReactFlowNode[],
    question: string,
    chatHistory: IMessage[],
    flowConfig?: ICommonObject,
    uploadedFilesContent?: string,
    availableVariables: IVariable[] = [],
    variableOverrides: ICommonObject[] = []
): Promise<INodeData> => {
    let flowNodeData = cloneDeep(reactFlowNodeData)

    const getParamValues = async (paramsObj: ICommonObject) => {
        for (const key in paramsObj) {
            const paramValue: string = paramsObj[key]
            if (Array.isArray(paramValue)) {
                const resolvedInstances = []
                for (const param of paramValue) {
                    const resolvedInstance = await getVariableValue(
                        param,
                        reactFlowNodes,
                        question,
                        chatHistory,
                        undefined,
                        flowConfig,
                        uploadedFilesContent,
                        availableVariables,
                        variableOverrides
                    )
                    resolvedInstances.push(resolvedInstance)
                }
                paramsObj[key] = resolvedInstances
            } else {
                const isAcceptVariable = reactFlowNodeData.inputParams.find((param) => param.name === key)?.acceptVariable ?? false
                const resolvedInstance = await getVariableValue(
                    paramValue,
                    reactFlowNodes,
                    question,
                    chatHistory,
                    isAcceptVariable,
                    flowConfig,
                    uploadedFilesContent,
                    availableVariables,
                    variableOverrides
                )
                paramsObj[key] = resolvedInstance
            }
        }
    }

    const paramsObj = flowNodeData['inputs'] ?? {}
    await getParamValues(paramsObj)

    return flowNodeData
}

/**
 * Loop through each inputs and replace their value with override config values
 * @param {INodeData} flowNodeData
 * @param {ICommonObject} overrideConfig
 * @param {INodeOverrides} nodeOverrides
 * @param {IVariableOverride[]} variableOverrides
 * @returns {INodeData}
 */
export const replaceInputsWithConfig = (
    flowNodeData: INodeData,
    overrideConfig: ICommonObject,
    nodeOverrides: INodeOverrides,
    variableOverrides: IVariableOverride[]
) => {
    const types = 'inputs'

    const isParameterEnabled = (nodeType: string, paramName: string): boolean => {
        if (!nodeOverrides[nodeType]) return false
        const parameter = nodeOverrides[nodeType].find((param: any) => param.name === paramName)
        return parameter?.enabled ?? false
    }

    const getParamValues = (inputsObj: ICommonObject) => {
        for (const config in overrideConfig) {
            /**
             * Several conditions:
             * 1. If config is 'analytics', always allow it
             * 2. If config is 'vars', check its object and filter out the variables that are not enabled for override
             * 3. If typeof config's value is an array, check if the parameter is enabled and apply directly
             * 4. If typeof config's value is an object, check if the node id is in the overrideConfig object and if the parameter (systemMessagePrompt) is enabled
             * Example:
             * "systemMessagePrompt": {
             *  "chatPromptTemplate_0": "You are an assistant"
             * }
             * 5. If typeof config's value is a string, check if the parameter is enabled
             * Example:
             * "systemMessagePrompt": "You are an assistant"
             */

            if (config === 'analytics') {
                // pass
            } else if (config === 'vars') {
                if (typeof overrideConfig[config] === 'object') {
                    const filteredVars: ICommonObject = {}

                    const vars = overrideConfig[config]
                    for (const variable in vars) {
                        const override = variableOverrides.find((v) => v.name === variable)
                        if (!override?.enabled) {
                            continue // Skip this variable if it's not enabled for override
                        }
                        filteredVars[variable] = vars[variable]
                    }
                    overrideConfig[config] = filteredVars
                }
            } else if (Array.isArray(overrideConfig[config])) {
                // Handle arrays as direct parameter values
                if (isParameterEnabled(flowNodeData.label, config)) {
                    // If existing value is also an array, concatenate; otherwise replace
                    const existingValue = inputsObj[config]
                    if (Array.isArray(existingValue)) {
                        inputsObj[config] = [...new Set([...existingValue, ...overrideConfig[config]])]
                    } else {
                        inputsObj[config] = overrideConfig[config]
                    }
                }
                continue
            } else if (overrideConfig[config] && typeof overrideConfig[config] === 'object') {
                const nodeIds = Object.keys(overrideConfig[config])
                if (nodeIds.includes(flowNodeData.id)) {
                    // Check if this parameter is enabled
                    if (isParameterEnabled(flowNodeData.label, config)) {
                        const existingValue = inputsObj[config]
                        const overrideValue = overrideConfig[config][flowNodeData.id]

                        // Merge objects instead of completely overriding
                        if (
                            typeof existingValue === 'object' &&
                            typeof overrideValue === 'object' &&
                            !Array.isArray(existingValue) &&
                            !Array.isArray(overrideValue) &&
                            existingValue !== null &&
                            overrideValue !== null
                        ) {
                            inputsObj[config] = Object.assign({}, existingValue, overrideValue)
                        } else if (typeof existingValue === 'string' && existingValue.startsWith('{') && existingValue.endsWith('}')) {
                            try {
                                const parsedExisting = JSON.parse(existingValue)
                                if (typeof overrideValue === 'object' && !Array.isArray(overrideValue)) {
                                    inputsObj[config] = Object.assign({}, parsedExisting, overrideValue)
                                } else {
                                    inputsObj[config] = overrideValue
                                }
                            } catch (e) {
                                inputsObj[config] = overrideValue
                            }
                        } else {
                            inputsObj[config] = overrideValue
                        }
                    }
                    continue
                } else if (nodeIds.some((nodeId) => nodeId.includes(flowNodeData.name))) {
                    /*
                     * "systemMessagePrompt": {
                     *   "chatPromptTemplate_0": "You are an assistant" <---- continue for loop if current node is chatPromptTemplate_1
                     * }
                     */
                    continue
                }
            } else {
                // Skip if it is an override "files" input, such as pdfFile, txtFile, etc
                if (typeof overrideConfig[config] === 'string' && overrideConfig[config].includes('FILE-STORAGE::')) {
                    // pass
                } else if (!isParameterEnabled(flowNodeData.label, config)) {
                    // Only proceed if the parameter is enabled
                    continue
                }
            }

            let paramValue = inputsObj[config]
            const overrideConfigValue = overrideConfig[config]
            if (overrideConfigValue) {
                if (typeof overrideConfigValue === 'object') {
                    // Handle arrays specifically - concatenate instead of replace
                    if (Array.isArray(overrideConfigValue) && Array.isArray(paramValue)) {
                        paramValue = [...new Set([...paramValue, ...overrideConfigValue])]
                    } else if (Array.isArray(overrideConfigValue)) {
                        paramValue = overrideConfigValue
                    } else {
                        switch (typeof paramValue) {
                            case 'string':
                                if (paramValue.startsWith('{') && paramValue.endsWith('}')) {
                                    try {
                                        paramValue = Object.assign({}, JSON.parse(paramValue), overrideConfigValue)
                                        break
                                    } catch (e) {
                                        // ignore
                                    }
                                }
                                paramValue = overrideConfigValue
                                break
                            case 'object':
                                // Make sure we're not dealing with arrays here
                                if (!Array.isArray(paramValue)) {
                                    paramValue = Object.assign({}, paramValue, overrideConfigValue)
                                } else {
                                    paramValue = overrideConfigValue
                                }
                                break
                            default:
                                paramValue = overrideConfigValue
                                break
                        }
                    }
                } else {
                    paramValue = overrideConfigValue
                }
            }
            // Check if boolean
            if (paramValue === 'true') paramValue = true
            else if (paramValue === 'false') paramValue = false
            inputsObj[config] = paramValue
        }
    }

    const inputsObj = flowNodeData[types] ?? {}

    getParamValues(inputsObj)

    return flowNodeData
}

/**
 * Rebuild flow if LLMChain has dependency on other chains
 * User Question => Prompt_0 => LLMChain_0 => Prompt-1 => LLMChain_1
 * @param {IReactFlowNode[]} startingNodes
 * @returns {boolean}
 */
export const isStartNodeDependOnInput = (startingNodes: IReactFlowNode[], nodes: IReactFlowNode[]): boolean => {
    for (const node of startingNodes) {
        if (node.data.category === 'Cache') return true
        for (const inputName in node.data.inputs) {
            const inputVariables = getInputVariables(node.data.inputs[inputName])
            if (inputVariables.length > 0) return true
        }
    }
    const whitelistNodeNames = ['vectorStoreToDocument', 'autoGPT', 'chatPromptTemplate', 'promptTemplate'] //If these nodes are found, chatflow cannot be reused
    for (const node of nodes) {
        if (node.data.name === 'chatPromptTemplate' || node.data.name === 'promptTemplate') {
            let promptValues: ICommonObject = {}
            const promptValuesRaw = node.data.inputs?.promptValues
            if (promptValuesRaw) {
                try {
                    promptValues = typeof promptValuesRaw === 'object' ? promptValuesRaw : JSON.parse(promptValuesRaw)
                } catch (exception) {
                    console.error(exception)
                }
            }
            if (getAllValuesFromJson(promptValues).includes(`{{${QUESTION_VAR_PREFIX}}}`)) return true
        } else if (whitelistNodeNames.includes(node.data.name)) return true
    }
    return false
}

/**
 * Rebuild flow if new override config is provided
 * @param {boolean} isInternal
 * @param {ICommonObject} existingOverrideConfig
 * @param {ICommonObject} newOverrideConfig
 * @returns {boolean}
 */
export const isSameOverrideConfig = (
    isInternal: boolean,
    existingOverrideConfig?: ICommonObject,
    newOverrideConfig?: ICommonObject
): boolean => {
    if (isInternal) {
        if (existingOverrideConfig && Object.keys(existingOverrideConfig).length) return false
        return true
    }
    // If existing and new overrideconfig are the same
    if (
        existingOverrideConfig &&
        Object.keys(existingOverrideConfig).length &&
        newOverrideConfig &&
        Object.keys(newOverrideConfig).length &&
        isEqual(existingOverrideConfig, newOverrideConfig)
    ) {
        return true
    }
    // If there is no existing and new overrideconfig
    if (!existingOverrideConfig && !newOverrideConfig) return true
    return false
}

/**
 * @param {string} existingChatId
 * @param {string} newChatId
 * @returns {boolean}
 */
export const isSameChatId = (existingChatId?: string, newChatId?: string): boolean => {
    if (isEqual(existingChatId, newChatId)) {
        return true
    }
    if (!existingChatId && !newChatId) return true
    return false
}

/**
 * Find all available input params config
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {IComponentCredentials} componentCredentials
 * @returns {IOverrideConfig[]}
 */
export const findAvailableConfigs = (reactFlowNodes: IReactFlowNode[], componentCredentials: IComponentCredentials) => {
    const configs: IOverrideConfig[] = []

    for (const flowNode of reactFlowNodes) {
        for (const inputParam of flowNode.data.inputParams) {
            let obj: IOverrideConfig | undefined
            if (inputParam.type === 'file') {
                obj = {
                    node: flowNode.data.label,
                    nodeId: flowNode.data.id,
                    label: inputParam.label,
                    name: 'files',
                    type: inputParam.fileType ?? inputParam.type
                }
            } else if (inputParam.type === 'options') {
                obj = {
                    node: flowNode.data.label,
                    nodeId: flowNode.data.id,
                    label: inputParam.label,
                    name: inputParam.name,
                    type: inputParam.options
                        ? inputParam.options
                              ?.map((option) => {
                                  return option.name
                              })
                              .join(', ')
                        : 'string'
                }
            } else if (inputParam.type === 'credential') {
                // get component credential inputs
                for (const name of inputParam.credentialNames ?? []) {
                    if (Object.prototype.hasOwnProperty.call(componentCredentials, name)) {
                        const inputs = componentCredentials[name]?.inputs ?? []
                        for (const input of inputs) {
                            obj = {
                                node: flowNode.data.label,
                                nodeId: flowNode.data.id,
                                label: input.label,
                                name: input.name,
                                type: input.type === 'password' ? 'string' : input.type
                            }
                            configs.push(obj)
                        }
                    }
                }
                continue
            } else if (inputParam.type === 'array') {
                const arrayItem = inputParam.array
                if (Array.isArray(arrayItem)) {
                    const arrayItemSchema: Record<string, string> = {}
                    // Build object schema representing the structure of each array item
                    for (const item of arrayItem) {
                        let itemType = item.type
                        if (itemType === 'options') {
                            const availableOptions = item.options?.map((option) => option.name).join(', ')
                            itemType = `(${availableOptions})`
                        } else if (itemType === 'file') {
                            itemType = item.fileType ?? item.type
                        }
                        arrayItemSchema[item.name] = itemType
                    }
                    obj = {
                        node: flowNode.data.label,
                        nodeId: flowNode.data.id,
                        label: inputParam.label,
                        name: inputParam.name,
                        type: inputParam.type,
                        schema: arrayItemSchema
                    }
                }
            } else if (inputParam.loadConfig) {
                const configData = flowNode?.data?.inputs?.[`${inputParam.name}Config`]
                if (configData) {
                    // Parse config data to extract schema
                    let parsedConfig: any = {}
                    try {
                        parsedConfig = typeof configData === 'string' ? JSON.parse(configData) : configData
                    } catch (e) {
                        // If parsing fails, treat as empty object
                        parsedConfig = {}
                    }

                    // Generate schema from config structure
                    const configSchema: Record<string, string> = {}
                    parsedConfig = _removeCredentialId(parsedConfig)
                    for (const key in parsedConfig) {
                        if (key === inputParam.name) continue
                        const value = parsedConfig[key]
                        let fieldType = 'string' // default type

                        if (typeof value === 'boolean') {
                            fieldType = 'boolean'
                        } else if (typeof value === 'number') {
                            fieldType = 'number'
                        } else if (Array.isArray(value)) {
                            fieldType = 'array'
                        } else if (typeof value === 'object' && value !== null) {
                            fieldType = 'object'
                        }

                        configSchema[key] = fieldType
                    }

                    obj = {
                        node: flowNode.data.label,
                        nodeId: flowNode.data.id,
                        label: `${inputParam.label} Config`,
                        name: `${inputParam.name}Config`,
                        type: `json`,
                        schema: configSchema
                    }
                }
            } else {
                obj = {
                    node: flowNode.data.label,
                    nodeId: flowNode.data.id,
                    label: inputParam.label,
                    name: inputParam.name,
                    type: inputParam.type === 'password' ? 'string' : inputParam.type
                }
            }
            if (obj && !configs.some((config) => JSON.stringify(config) === JSON.stringify(obj))) {
                configs.push(obj)
            }
        }
    }
    return configs
}

/**
 * Check to see if flow valid for stream
 * TODO: perform check from component level. i.e: set streaming on component, and check here
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {INodeData} endingNodeData
 * @returns {boolean}
 */
export const isFlowValidForStream = (reactFlowNodes: IReactFlowNode[], endingNodeData: INodeData) => {
    /** Deprecated, add streaming input param to the component instead **/
    const streamAvailableLLMs = {
        'Chat Models': [
            'azureChatOpenAI',
            'chatOpenAI',
            'chatOpenAI_LlamaIndex',
            'chatOpenAICustom',
            'chatAnthropic',
            'chatAnthropic_LlamaIndex',
            'chatOllama',
            'chatOllama_LlamaIndex',
            'awsChatBedrock',
            'chatMistralAI',
            'chatMistral_LlamaIndex',
            'chatAlibabaTongyi',
            'groqChat',
            'chatGroq_LlamaIndex',
            'chatCohere',
            'chatGoogleGenerativeAI',
            'chatTogetherAI',
            'chatTogetherAI_LlamaIndex',
            'chatFireworks',
            'ChatSambanova',
            'chatBaiduWenxin',
            'chatCometAPI'
        ],
        LLMs: ['azureOpenAI', 'openAI', 'ollama']
    }

    let isChatOrLLMsExist = false
    for (const flowNode of reactFlowNodes) {
        const data = flowNode.data
        if (data.category === 'Chat Models' || data.category === 'LLMs') {
            if (data.inputs?.streaming === false || data.inputs?.streaming === 'false') {
                return false
            }
            if (data.inputs?.streaming === true || data.inputs?.streaming === 'true') {
                isChatOrLLMsExist = true // passed, proceed to next check
            }
            /** Deprecated, add streaming input param to the component instead **/
            if (!Object.prototype.hasOwnProperty.call(data.inputs, 'streaming') && !data.inputs?.streaming) {
                isChatOrLLMsExist = true
                const validLLMs = streamAvailableLLMs[data.category]
                if (!validLLMs.includes(data.name)) return false
            }
        }
    }

    let isValidChainOrAgent = false
    if (endingNodeData.category === 'Chains') {
        // Chains that are not available to stream
        const blacklistChains = ['openApiChain', 'vectaraQAChain']
        isValidChainOrAgent = !blacklistChains.includes(endingNodeData.name)
    } else if (endingNodeData.category === 'Agents') {
        // Agent that are available to stream
        const whitelistAgents = ['csvAgent', 'airtableAgent', 'toolAgent', 'conversationalRetrievalToolAgent', 'openAIToolAgentLlamaIndex']
        isValidChainOrAgent = whitelistAgents.includes(endingNodeData.name)

        // If agent is openAIAssistant, streaming is enabled
        if (endingNodeData.name === 'openAIAssistant') return true
    } else if (endingNodeData.category === 'Engine') {
        // Engines that are available to stream
        const whitelistEngine = ['contextChatEngine', 'simpleChatEngine', 'queryEngine', 'subQuestionQueryEngine']
        isValidChainOrAgent = whitelistEngine.includes(endingNodeData.name)
    }

    // If no output parser, flow is available to stream
    let isOutputParserExist = false
    for (const flowNode of reactFlowNodes) {
        const data = flowNode.data
        if (data.category.includes('Output Parser')) {
            isOutputParserExist = true
        }
    }

    return isChatOrLLMsExist && isValidChainOrAgent && !isOutputParserExist
}

/**
 * Returns the encryption key
 * @returns {Promise<string>}
 */
export const getEncryptionKey = async (): Promise<string> => {
    if (process.env.FLOWISE_SECRETKEY_OVERWRITE !== undefined && process.env.FLOWISE_SECRETKEY_OVERWRITE !== '') {
        return process.env.FLOWISE_SECRETKEY_OVERWRITE
    }
    if (USE_AWS_SECRETS_MANAGER && secretsManagerClient) {
        const secretId = process.env.SECRETKEY_AWS_NAME || 'FlowiseEncryptionKey'
        try {
            const command = new GetSecretValueCommand({ SecretId: secretId })
            const response = await secretsManagerClient.send(command)

            if (response.SecretString) {
                return response.SecretString
            }
        } catch (error: any) {
            if (error.name === 'ResourceNotFoundException') {
                // Secret doesn't exist, create it
                const newKey = generateEncryptKey()
                const createCommand = new CreateSecretCommand({
                    Name: secretId,
                    SecretString: newKey
                })
                await secretsManagerClient.send(createCommand)
                return newKey
            }
            throw error
        }
    }
    try {
        return await fs.promises.readFile(getEncryptionKeyPath(), 'utf8')
    } catch (error) {
        const encryptKey = generateEncryptKey()
        const defaultLocation = process.env.SECRETKEY_PATH
            ? path.join(process.env.SECRETKEY_PATH, 'encryption.key')
            : path.join(getUserHome(), '.flowise', 'encryption.key')
        await fs.promises.writeFile(defaultLocation, encryptKey)
        return encryptKey
    }
}

/**
 * Encrypt credential data
 * @param {ICredentialDataDecrypted} plainDataObj
 * @returns {Promise<string>}
 */
export const encryptCredentialData = async (plainDataObj: ICredentialDataDecrypted): Promise<string> => {
    const encryptKey = await getEncryptionKey()
    return AES.encrypt(JSON.stringify(plainDataObj), encryptKey).toString()
}

/**
 * Decrypt credential data
 * @param {string} encryptedData
 * @param {string} componentCredentialName
 * @param {IComponentCredentials} componentCredentials
 * @returns {Promise<ICredentialDataDecrypted>}
 */
export const decryptCredentialData = async (
    encryptedData: string,
    componentCredentialName?: string,
    componentCredentials?: IComponentCredentials
): Promise<ICredentialDataDecrypted> => {
    let decryptedDataStr: string

    if (USE_AWS_SECRETS_MANAGER && secretsManagerClient) {
        try {
            if (encryptedData.startsWith('FlowiseCredential_')) {
                const command = new GetSecretValueCommand({ SecretId: encryptedData })
                const response = await secretsManagerClient.send(command)

                if (response.SecretString) {
                    const secretObj = JSON.parse(response.SecretString)
                    decryptedDataStr = JSON.stringify(secretObj)
                } else {
                    throw new Error('Failed to retrieve secret value.')
                }
            } else {
                const encryptKey = await getEncryptionKey()
                const decryptedData = AES.decrypt(encryptedData, encryptKey)
                decryptedDataStr = decryptedData.toString(enc.Utf8)
            }
        } catch (error) {
            console.error(error)
            throw new Error('Failed to decrypt credential data.')
        }
    } else {
        // Fallback to existing code
        const encryptKey = await getEncryptionKey()
        const decryptedData = AES.decrypt(encryptedData, encryptKey)
        decryptedDataStr = decryptedData.toString(enc.Utf8)
    }

    if (!decryptedDataStr) return {}
    try {
        if (componentCredentialName && componentCredentials) {
            const plainDataObj = JSON.parse(decryptedDataStr)
            return redactCredentialWithPasswordType(componentCredentialName, plainDataObj, componentCredentials)
        }
        return JSON.parse(decryptedDataStr)
    } catch (e) {
        console.error(e)
        return {}
    }
}

/**
 * Generate an encryption key
 * @returns {string}
 */
export const generateEncryptKey = (): string => {
    return randomBytes(24).toString('base64')
}

/**
 * Transform ICredentialBody from req to Credential entity
 * @param {ICredentialReqBody} body
 * @returns {Credential}
 */
export const transformToCredentialEntity = async (body: ICredentialReqBody): Promise<Credential> => {
    const credentialBody: ICommonObject = {
        name: body.name,
        credentialName: body.credentialName
    }

    if (body.plainDataObj) {
        const encryptedData = await encryptCredentialData(body.plainDataObj)
        credentialBody.encryptedData = encryptedData
    }

    const newCredential = new Credential()
    Object.assign(newCredential, credentialBody)

    if (body.workspaceId) {
        newCredential.workspaceId = body.workspaceId
    }

    return newCredential
}

/**
 * Redact values that are of password type to avoid sending back to client
 * @param {string} componentCredentialName
 * @param {ICredentialDataDecrypted} decryptedCredentialObj
 * @param {IComponentCredentials} componentCredentials
 * @returns {ICredentialDataDecrypted}
 */
export const redactCredentialWithPasswordType = (
    componentCredentialName: string,
    decryptedCredentialObj: ICredentialDataDecrypted,
    componentCredentials: IComponentCredentials
): ICredentialDataDecrypted => {
    const plainDataObj = cloneDeep(decryptedCredentialObj)
    for (const cred in plainDataObj) {
        const inputParam = componentCredentials[componentCredentialName].inputs?.find((inp) => inp.type === 'password' && inp.name === cred)
        if (inputParam) {
            plainDataObj[cred] = REDACTED_CREDENTIAL_VALUE
        }
    }
    return plainDataObj
}

/**
 * Get sessionId
 * Hierarchy of sessionId (top down)
 * API/Embed:
 * (1) Provided in API body - incomingInput.overrideConfig: { sessionId: 'abc' }
 * (2) Provided in API body - incomingInput.chatId
 *
 * API/Embed + UI:
 * (3) Hard-coded sessionId in UI
 * (4) Not specified on UI nor API, default to chatId
 * @param {IReactFlowNode | undefined} memoryNode
 * @param {IncomingInput} incomingInput
 * @param {string} chatId
 * @param {boolean} isInternal
 * @returns {string}
 */
export const getMemorySessionId = (
    memoryNode: IReactFlowNode | undefined,
    incomingInput: IncomingInput,
    chatId: string,
    isInternal: boolean
): string => {
    if (!isInternal) {
        // Provided in API body - incomingInput.overrideConfig: { sessionId: 'abc' }
        if (incomingInput.overrideConfig?.sessionId) {
            return incomingInput.overrideConfig?.sessionId
        }
        // Provided in API body - incomingInput.chatId
        if (incomingInput.chatId) {
            return incomingInput.chatId
        }
    }

    // Hard-coded sessionId in UI
    if (memoryNode && memoryNode.data.inputs?.sessionId) {
        return memoryNode.data.inputs.sessionId
    }

    // Default chatId
    return chatId
}

/**
 * Get chat messages from sessionId
 * @param {IReactFlowNode} memoryNode
 * @param {string} sessionId
 * @param {IReactFlowNode} memoryNode
 * @param {IComponentNodes} componentNodes
 * @param {DataSource} appDataSource
 * @param {IDatabaseEntity} databaseEntities
 * @param {any} logger
 * @returns {IMessage[]}
 */
export const getSessionChatHistory = async (
    chatflowid: string,
    sessionId: string,
    memoryNode: IReactFlowNode,
    componentNodes: IComponentNodes,
    appDataSource: DataSource,
    databaseEntities: IDatabaseEntity,
    logger: any,
    prependMessages?: IMessage[]
): Promise<IMessage[]> => {
    const nodeInstanceFilePath = componentNodes[memoryNode.data.name].filePath as string
    const nodeModule = await import(nodeInstanceFilePath)
    const newNodeInstance = new nodeModule.nodeClass()

    // Replace memory's sessionId/chatId
    if (memoryNode.data.inputs) {
        memoryNode.data.inputs.sessionId = sessionId
    }

    const initializedInstance: FlowiseMemory = await newNodeInstance.init(memoryNode.data, '', {
        chatflowid,
        appDataSource,
        databaseEntities,
        logger
    })

    return (await initializedInstance.getChatMessages(sessionId, undefined, prependMessages)) as IMessage[]
}

/**
 * Method that find memory that is connected within chatflow
 * In a chatflow, there should only be 1 memory node
 * @param {IReactFlowNode[]} nodes
 * @param {IReactFlowEdge[]} edges
 * @returns {IReactFlowNode | undefined}
 */
export const findMemoryNode = (nodes: IReactFlowNode[], edges: IReactFlowEdge[]): IReactFlowNode | undefined => {
    const memoryNodes = nodes.filter((node) => node.data.category === 'Memory')
    const memoryNodeIds = memoryNodes.map((mem) => mem.data.id)

    for (const edge of edges) {
        if (memoryNodeIds.includes(edge.source)) {
            const memoryNode = nodes.find((node) => node.data.id === edge.source)
            return memoryNode
        }
    }

    return undefined
}

/**
 * Get all values from a JSON object
 * @param {any} obj
 * @returns {any[]}
 */
export const getAllValuesFromJson = (obj: any): any[] => {
    const values: any[] = []

    function extractValues(data: any) {
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                for (const item of data) {
                    extractValues(item)
                }
            } else {
                for (const key in data) {
                    extractValues(data[key])
                }
            }
        } else {
            values.push(data)
        }
    }

    extractValues(obj)
    return values
}

/**
 * Get only essential flow data items for telemetry
 * @param {IReactFlowNode[]} nodes
 * @param {IReactFlowEdge[]} edges
 */
export const getTelemetryFlowObj = (nodes: IReactFlowNode[], edges: IReactFlowEdge[]) => {
    const nodeData = nodes.map((node) => node.id)
    const edgeData = edges.map((edge) => ({ source: edge.source, target: edge.target }))
    return { nodes: nodeData, edges: edgeData }
}

/**
 * Get app current version
 */
export const getAppVersion = async () => {
    const getPackageJsonPath = (): string => {
        const checkPaths = [
            path.join(__dirname, '..', 'package.json'),
            path.join(__dirname, '..', '..', 'package.json'),
            path.join(__dirname, '..', '..', '..', 'package.json'),
            path.join(__dirname, '..', '..', '..', '..', 'package.json'),
            path.join(__dirname, '..', '..', '..', '..', '..', 'package.json')
        ]
        for (const checkPath of checkPaths) {
            if (fs.existsSync(checkPath)) {
                return checkPath
            }
        }
        return ''
    }

    const packagejsonPath = getPackageJsonPath()
    if (!packagejsonPath) return ''
    try {
        const content = await fs.promises.readFile(packagejsonPath, 'utf8')
        const parsedContent = JSON.parse(content)
        return parsedContent.version
    } catch (error) {
        return ''
    }
}

export const convertToValidFilename = (word: string) => {
    return word
        .replace(/[/|\\:*?"<>]/g, ' ')
        .replace(' ', '')
        .toLowerCase()
}

export const aMonthAgo = () => {
    const date = new Date()
    date.setMonth(new Date().getMonth() - 1)
    return date
}

export const getAPIOverrideConfig = (chatflow: IChatFlow) => {
    try {
        const apiConfig = chatflow.apiConfig ? JSON.parse(chatflow.apiConfig) : {}
        const nodeOverrides: INodeOverrides =
            apiConfig.overrideConfig && apiConfig.overrideConfig.nodes ? apiConfig.overrideConfig.nodes : {}
        const variableOverrides: IVariableOverride[] =
            apiConfig.overrideConfig && apiConfig.overrideConfig.variables ? apiConfig.overrideConfig.variables : []
        const apiOverrideStatus: boolean =
            apiConfig.overrideConfig && apiConfig.overrideConfig.status ? apiConfig.overrideConfig.status : false

        return { nodeOverrides, variableOverrides, apiOverrideStatus }
    } catch (error) {
        return { nodeOverrides: {}, variableOverrides: [], apiOverrideStatus: false }
    }
}

export const getUploadPath = (): string => {
    return process.env.BLOB_STORAGE_PATH
        ? path.join(process.env.BLOB_STORAGE_PATH, 'uploads')
        : path.join(getUserHome(), '.flowise', 'uploads')
}

export function generateId() {
    return uuidv4()
}

export const getMulterStorage = () => {
    const storageType = process.env.STORAGE_TYPE ? process.env.STORAGE_TYPE : 'local'

    if (storageType === 's3') {
        const s3Client = getS3Config().s3Client
        const Bucket = getS3Config().Bucket

        const upload = multer({
            storage: multerS3({
                s3: s3Client,
                bucket: Bucket,
                metadata: function (req, file, cb) {
                    cb(null, { fieldName: file.fieldname, originalName: file.originalname })
                },
                key: function (req, file, cb) {
                    cb(null, `${generateId()}`)
                }
            })
        })
        return upload
    } else if (storageType === 'gcs') {
        return multer({
            storage: new MulterGoogleCloudStorage({
                projectId: process.env.GOOGLE_CLOUD_STORAGE_PROJ_ID,
                bucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET_NAME,
                keyFilename: process.env.GOOGLE_CLOUD_STORAGE_CREDENTIAL,
                uniformBucketLevelAccess: Boolean(process.env.GOOGLE_CLOUD_UNIFORM_BUCKET_ACCESS) ?? true,
                destination: `uploads/${generateId()}`
            })
        })
    } else {
        return multer({ dest: getUploadPath() })
    }
}

/**
 * Calculate depth of each node from starting nodes
 * @param {INodeDirectedGraph} graph
 * @param {string[]} startingNodeIds
 * @returns {Record<string, number>} Map of nodeId to its depth
 */
export const calculateNodesDepth = (graph: INodeDirectedGraph, startingNodeIds: string[]): Record<string, number> => {
    const depths: Record<string, number> = {}
    const visited = new Set<string>()

    // Initialize all nodes with depth -1 (unvisited)
    for (const nodeId in graph) {
        depths[nodeId] = -1
    }

    // BFS queue with [nodeId, depth]
    const queue: [string, number][] = startingNodeIds.map((id) => [id, 0])

    // Set starting nodes depth to 0
    startingNodeIds.forEach((id) => {
        depths[id] = 0
    })

    while (queue.length > 0) {
        const [currentNode, currentDepth] = queue.shift()!

        if (visited.has(currentNode)) continue
        visited.add(currentNode)

        // Process all neighbors
        for (const neighbor of graph[currentNode]) {
            if (!visited.has(neighbor)) {
                // Update depth if unvisited or found shorter path
                if (depths[neighbor] === -1 || depths[neighbor] > currentDepth + 1) {
                    depths[neighbor] = currentDepth + 1
                }
                queue.push([neighbor, currentDepth + 1])
            }
        }
    }

    return depths
}

/**
 * Helper function to get all nodes in a path starting from a node
 * @param {INodeDirectedGraph} graph
 * @param {string} startNode
 * @returns {string[]}
 */
export const getAllNodesInPath = (startNode: string, graph: INodeDirectedGraph): string[] => {
    const nodes = new Set<string>()
    const queue = [startNode]

    while (queue.length > 0) {
        const current = queue.shift()!
        if (nodes.has(current)) continue

        nodes.add(current)
        if (graph[current]) {
            queue.push(...graph[current])
        }
    }

    return Array.from(nodes)
}

export const _removeCredentialId = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj

    if (Array.isArray(obj)) {
        return obj.map((item) => _removeCredentialId(item))
    }

    const newObj: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
        if (key === 'FLOWISE_CREDENTIAL_ID') continue
        newObj[key] = _removeCredentialId(value)
    }
    return newObj
}

/**
 * Validates that history items follow the expected schema
 * @param {any[]} history - Array of history items to validate
 * @returns {boolean} - True if all items are valid, false otherwise
 */
export const validateHistorySchema = (history: any[]): boolean => {
    if (!Array.isArray(history)) {
        return false
    }

    return history.every((item) => {
        // Check if item is an object
        if (typeof item !== 'object' || item === null) {
            return false
        }

        // Check if role exists and is valid
        if (typeof item.role !== 'string' || !['apiMessage', 'userMessage'].includes(item.role)) {
            return false
        }

        // Check if content exists and is a string
        if (typeof item.content !== 'string') {
            return false
        }

        return true
    })
}
